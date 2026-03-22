from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import Donor, DonorAuditLog, Campaign
from .serializers import DonorSerializer, DonorListSerializer, DonorDetailSerializer, DonorAuditLogSerializer, CampaignSerializer


class DonorViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing donors.
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'email', 'phone']
    ordering_fields = ['created_at', 'name', 'total_donations', 'last_donation_date']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return DonorListSerializer
        elif self.action == 'retrieve':
            return DonorDetailSerializer
        return DonorSerializer
    
    def get_queryset(self):
        queryset = Donor.objects.all()
        
        # Filter by category if provided
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category=category)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset
    
    def perform_create(self, serializer):
        donor = serializer.save()
        # Log the creation
        DonorAuditLog.objects.create(
            donor=donor,
            action='create',
            changed_by=self.request.user.username,
            changed_fields={'created': True}
        )
    
    def perform_update(self, serializer):
        old_donor = self.get_object()
        old_data = DonorSerializer(old_donor).data
        
        donor = serializer.save()
        new_data = DonorSerializer(donor).data
        
        # Find changed fields
        changed_fields = {}
        for key in old_data:
            if old_data[key] != new_data[key]:
                changed_fields[key] = {'old': old_data[key], 'new': new_data[key]}
        
        # Log the update
        if changed_fields:
            DonorAuditLog.objects.create(
                donor=donor,
                action='update',
                changed_by=self.request.user.username,
                changed_fields=changed_fields
            )
    
    @action(detail=True, methods=['post'])
    def mark_inactive(self, request, pk=None):
        donor = self.get_object()
        donor.is_active = False
        donor.save()
        
        DonorAuditLog.objects.create(
            donor=donor,
            action='delete',
            changed_by=request.user.username,
            changed_fields={'is_active': False}
        )
        
        return Response({'status': 'Donor marked as inactive'})
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get donor statistics"""
        queryset = self.get_queryset()
        stats = {
            'total_donors': queryset.filter(is_active=True).count(),
            'total_donations': sum(d.total_donations for d in queryset),
            'by_category': {}
        }
        
        for category in Donor.DONOR_CATEGORY_CHOICES:
            count = queryset.filter(category=category[0], is_active=True).count()
            stats['by_category'][category[1]] = count
        
        return Response(stats)


class CampaignViewSet(viewsets.ModelViewSet):
    """API endpoint for managing campaigns"""
    queryset = Campaign.objects.all()
    serializer_class = CampaignSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'name', 'goal_amount']
    ordering = ['-created_at']
    
    def get_queryset(self):
        queryset = Campaign.objects.all()
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset
