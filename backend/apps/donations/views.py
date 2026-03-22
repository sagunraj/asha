from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count
from .models import Donation, DonationImportLog
from .serializers import DonationSerializer, DonationListSerializer, DonationImportLogSerializer
import csv
from datetime import datetime


class DonationViewSet(viewsets.ModelViewSet):
    """API endpoint for managing donations"""
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['donor__name', 'donor__email', 'reference_number']
    ordering_fields = ['donation_date', 'amount', 'created_at']
    ordering = ['-donation_date']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return DonationListSerializer
        return DonationSerializer
    
    def get_queryset(self):
        queryset = Donation.objects.filter(is_active=True).select_related('donor', 'campaign')
        
        # Filter by date range
        from_date = self.request.query_params.get('from_date', None)
        to_date = self.request.query_params.get('to_date', None)
        
        if from_date:
            queryset = queryset.filter(donation_date__gte=from_date)
        if to_date:
            queryset = queryset.filter(donation_date__lte=to_date)
        
        # Filter by tax year
        tax_year = self.request.query_params.get('tax_year', None)
        if tax_year:
            queryset = queryset.filter(tax_year=tax_year)
        
        # Filter by campaign
        campaign_id = self.request.query_params.get('campaign_id', None)
        if campaign_id:
            queryset = queryset.filter(campaign_id=campaign_id)
        
        # Filter by donation type
        donation_type = self.request.query_params.get('donation_type', None)
        if donation_type:
            queryset = queryset.filter(donation_type=donation_type)
        
        # Filter by status
        status = self.request.query_params.get('status', None)
        if status:
            queryset = queryset.filter(status=status)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get donation statistics"""
        queryset = self.get_queryset()
        
        # Parse date range
        from_date = request.query_params.get('from_date', None)
        to_date = request.query_params.get('to_date', None)
        
        stats = {
            'total_donations': queryset.count(),
            'total_amount': float(queryset.aggregate(Sum('amount'))['amount__sum'] or 0),
            'average_donation': float(queryset.aggregate(Sum('amount'))['amount__sum'] or 0 / queryset.count() if queryset.count() > 0 else 0),
            'recurring_count': queryset.filter(is_recurring=True).count(),
            'one_time_count': queryset.filter(is_recurring=False).count(),
            'by_status': {}
        }
        
        for status_choice in Donation.STATUS_CHOICES:
            count = queryset.filter(status=status_choice[0]).count()
            amount = float(queryset.filter(status=status_choice[0]).aggregate(Sum('amount'))['amount__sum'] or 0)
            stats['by_status'][status_choice[1]] = {'count': count, 'amount': amount}
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def by_month(self, request):
        """Get donations grouped by month"""
        from django.db.models.functions import TruncMonth
        from django.db.models import Count, Sum
        
        queryset = self.get_queryset()
        
        donations_by_month = queryset.annotate(
            month=TruncMonth('donation_date')
        ).values('month').annotate(
            count=Count('id'),
            total=Sum('amount')
        ).order_by('month')
        
        return Response(list(donations_by_month))
    
    @action(detail=False, methods=['post'])
    def import_csv(self, request):
        """Import donations from CSV file"""
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        filename = file.name
        
        successful = 0
        failed = 0
        errors = []
        
        try:
            decoded_file = file.read().decode('utf-8').splitlines()
            csv_reader = csv.DictReader(decoded_file)
            
            for row in csv_reader:
                try:
                    from apps.donors.models import Donor
                    
                    # Get or create donor
                    donor, _ = Donor.objects.get_or_create(
                        email=row.get('donor_email'),
                        defaults={
                            'name': row.get('donor_name'),
                            'phone': row.get('donor_phone', ''),
                        }
                    )
                    
                    # Create donation
                    donation = Donation.objects.create(
                        donor=donor,
                        amount=float(row.get('amount', 0)),
                        donation_date=datetime.strptime(row.get('donation_date', ''), '%Y-%m-%d').date(),
                        donation_type=row.get('donation_type', 'one_time'),
                        source=row.get('source', 'other'),
                        reference_number=row.get('reference_number', ''),
                        notes=row.get('notes', ''),
                    )
                    successful += 1
                except Exception as e:
                    failed += 1
                    errors.append({'row': row, 'error': str(e)})
            
            # Create import log
            import_log = DonationImportLog.objects.create(
                file_name=filename,
                total_records=successful + failed,
                successful_imports=successful,
                failed_imports=failed,
                error_details={'errors': errors},
                imported_by=request.user.username
            )
            
            return Response({
                'message': 'Import completed',
                'successful': successful,
                'failed': failed,
                'errors': errors
            })
        
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
