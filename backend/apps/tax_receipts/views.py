from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.mail import send_mail
from django.conf import settings
from .models import TaxReceipt, TaxReceiptTemplate, TaxReceiptEmailLog
from .serializers import TaxReceiptSerializer, TaxReceiptTemplateSerializer, TaxReceiptEmailLogSerializer
import uuid


class TaxReceiptTemplateViewSet(viewsets.ModelViewSet):
    """API endpoint for managing tax receipt templates"""
    queryset = TaxReceiptTemplate.objects.all()
    serializer_class = TaxReceiptTemplateSerializer
    permission_classes = [IsAuthenticated]


class TaxReceiptViewSet(viewsets.ModelViewSet):
    """API endpoint for managing tax receipts"""
    serializer_class = TaxReceiptSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = TaxReceipt.objects.all()
        
        # Filter by tax year
        tax_year = self.request.query_params.get('tax_year', None)
        if tax_year:
            queryset = queryset.filter(tax_year=tax_year)
        
        # Filter by delivery status
        status = self.request.query_params.get('status', None)
        if status:
            queryset = queryset.filter(email_delivery_status=status)
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def generate_for_year(self, request):
        """Generate tax receipts for donors in a given tax year"""
        tax_year = request.data.get('tax_year')
        template_id = request.data.get('template_id')
        
        if not tax_year:
            return Response({'error': 'tax_year is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get template
        if template_id:
            template = TaxReceiptTemplate.objects.get(id=template_id)
        else:
            template = TaxReceiptTemplate.objects.filter(is_default=True).first()
        
        if not template:
            return Response({'error': 'No template found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get all donors with donations in the tax year
        from apps.donations.models import Donation
        from apps.donors.models import Donor
        
        donors_with_donations = Donor.objects.filter(
            donations__tax_year=tax_year,
            donations__is_active=True
        ).distinct()
        
        created_count = 0
        for donor in donors_with_donations:
            donations = donor.donations.filter(tax_year=tax_year, is_active=True)
            total_amount = sum(d.amount for d in donations)
            
            receipt, created = TaxReceipt.objects.get_or_create(
                donor=donor,
                tax_year=tax_year,
                defaults={
                    'receipt_number': f"TR-{tax_year}-{uuid.uuid4().hex[:8].upper()}",
                    'total_amount': total_amount,
                    'template_used': template
                }
            )
            
            if created:
                created_count += 1
                # Add donations to the receipt
                receipt.donations_included.set(donations)
        
        return Response({
            'message': f'{created_count} tax receipts generated',
            'tax_year': tax_year
        })
    
    @action(detail=False, methods=['post'])
    def send_bulk_emails(self, request):
        """Send tax receipt emails to multiple donors"""
        tax_year = request.data.get('tax_year')
        template_id = request.data.get('template_id')
        donor_ids = request.data.get('donor_ids', [])
        
        if not tax_year:
            return Response({'error': 'tax_year is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get template
        if template_id:
            template = TaxReceiptTemplate.objects.get(id=template_id)
        else:
            template = TaxReceiptTemplate.objects.filter(is_default=True).first()
        
        if not template:
            return Response({'error': 'No template found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get tax receipts to send
        queryset = TaxReceipt.objects.filter(tax_year=tax_year)
        if donor_ids:
            queryset = queryset.filter(donor_id__in=donor_ids)
        
        successfully_sent = 0
        failed = 0
        
        for receipt in queryset:
            try:
                # Prepare email
                subject = template.subject
                
                # Replace placeholders
                body_html = template.body_html.replace('{{donor_name}}', receipt.donor.name)
                body_html = body_html.replace('{{amount}}', str(receipt.total_amount))
                body_html = body_html.replace('{{tax_year}}', str(tax_year))
                body_html = body_html.replace('{{organization_name}}', 'KPALS')
                
                # Send email
                send_mail(
                    subject,
                    body_html,
                    template.sender_email,
                    [receipt.donor.email],
                    html_message=body_html,
                    fail_silently=False,
                )
                
                # Update receipt
                from django.utils import timezone
                receipt.email_sent_at = timezone.now()
                receipt.email_delivery_status = 'sent'
                receipt.save()
                
                successfully_sent += 1
            
            except Exception as e:
                failed += 1
                receipt.email_delivery_status = 'failed'
                receipt.email_error_message = str(e)
                receipt.save()
        
        # Create email log
        email_log = TaxReceiptEmailLog.objects.create(
            tax_year=tax_year,
            template_used=template,
            total_recipients=successfully_sent + failed,
            successfully_sent=successfully_sent,
            failed=failed,
            sent_by=request.user.username
        )
        
        return Response({
            'message': 'Email campaign completed',
            'successfully_sent': successfully_sent,
            'failed': failed
        })
    
    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Download tax receipt as PDF"""
        receipt = self.get_object()
        
        # TODO: Implement PDF generation
        return Response({'message': 'PDF download endpoint'})
