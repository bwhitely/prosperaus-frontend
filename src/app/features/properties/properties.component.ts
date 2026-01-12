import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { switchMap, catchError, filter } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TwoDecimalDirective } from '../../shared/directives/two-decimal.directive';
import { PropertyService } from '../../core/services/property.service';
import { CashLiabilityService } from '../../core/services/cash-liability.service';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { PropertyResponse, PropertyRequest, MortgageResponse, MortgageRequest } from '../../shared/models/property.model';
import { CashAccountRequest, CashAccountResponse } from '../../shared/models/cash-liability.model';

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, DatePipe, MatButtonModule, MatIconModule, MatTooltipModule, TwoDecimalDirective],
  templateUrl: './properties.component.html',
  styleUrl: './properties.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PropertiesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private propertyService = inject(PropertyService);
  private cashLiabilityService = inject(CashLiabilityService);
  private confirmDialog = inject(ConfirmDialogService);

  properties = signal<PropertyResponse[]>([]);
  cashAccounts = signal<CashAccountResponse[]>([]);
  mortgages = signal<Map<string, MortgageResponse[]>>(new Map());
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Form state
  showPropertyForm = signal(false);
  showMortgageForm = signal(false);
  editingProperty = signal<PropertyResponse | null>(null);
  editingMortgage = signal<MortgageResponse | null>(null);
  selectedPropertyId = signal<string | null>(null);
  isSubmitting = signal(false);

  propertyForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    currentValue: [null, [Validators.required, Validators.min(1)]],
    propertyType: ['residential'],
    address: [''],
    purchasePrice: [null],
    purchaseDate: [''],
    isInvestment: [false],
    weeklyRent: [null],
    annualExpenses: [null]
  });

  mortgageForm: FormGroup = this.fb.group({
    lender: [''],
    loanName: [''],
    currentBalance: [null, [Validators.required, Validators.min(0)]],
    offsetBalance: [0],
    interestRate: [null, [Validators.required, Validators.min(0), Validators.max(25)]],
    isFixed: [false],
    fixedRateExpiry: [''],
    repaymentType: ['principal_and_interest'],
    isDeductible: [false]
  });

  propertyTypes = [
    { value: 'residential', label: 'Residential' },
    { value: 'investment', label: 'Investment Property' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'land', label: 'Land' }
  ];

  ngOnInit(): void {
    this.loadProperties();
    this.loadCashAccounts();
  }

  loadCashAccounts(): void {
    this.cashLiabilityService.getCashAccounts().subscribe({
      next: (accounts) => this.cashAccounts.set(accounts),
      error: () => {
        // Silent fail - offset sync is optional
      }
    });
  }

  loadProperties(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.propertyService.getProperties().subscribe({
      next: (properties) => {
        this.properties.set(properties);
        this.isLoading.set(false);
        // Load mortgages for each property
        properties.forEach(p => this.loadMortgagesForProperty(p.id));
      },
      error: (err) => {
        this.error.set('Failed to load properties');
        this.isLoading.set(false);
      }
    });
  }

  loadMortgagesForProperty(propertyId: string): void {
    this.propertyService.getMortgagesForProperty(propertyId).subscribe({
      next: (propertyMortgages) => {
        this.mortgages.update(m => {
          const newMap = new Map(m);
          newMap.set(propertyId, propertyMortgages);
          return newMap;
        });
      }
    });
  }

  getMortgagesForProperty(propertyId: string): MortgageResponse[] {
    return this.mortgages().get(propertyId) || [];
  }

  getTotalMortgageBalance(propertyId: string): number {
    const mortgages = this.getMortgagesForProperty(propertyId);
    return mortgages.reduce((sum, m) => sum + (m.effectiveBalance || m.currentBalance), 0);
  }

  // Property Form
  openAddPropertyForm(): void {
    this.editingProperty.set(null);
    this.propertyForm.reset({
      propertyType: 'residential',
      isInvestment: false
    });
    this.showPropertyForm.set(true);
  }

  openEditPropertyForm(property: PropertyResponse): void {
    this.editingProperty.set(property);
    this.propertyForm.patchValue({
      name: property.name,
      currentValue: property.currentValue,
      propertyType: property.propertyType,
      address: property.address || '',
      purchasePrice: property.purchasePrice,
      purchaseDate: property.purchaseDate || '',
      isInvestment: property.isInvestment,
      weeklyRent: property.weeklyRent,
      annualExpenses: property.annualExpenses
    });
    this.showPropertyForm.set(true);
  }

  closePropertyForm(): void {
    this.showPropertyForm.set(false);
    this.editingProperty.set(null);
  }

  saveProperty(): void {
    if (this.propertyForm.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const formValue = this.propertyForm.value;

    const request: PropertyRequest = {
      name: formValue.name,
      currentValue: formValue.currentValue,
      propertyType: formValue.propertyType,
      address: formValue.address || undefined,
      purchasePrice: formValue.purchasePrice || undefined,
      purchaseDate: formValue.purchaseDate || undefined,
      isInvestment: formValue.isInvestment,
      weeklyRent: formValue.weeklyRent || undefined,
      annualExpenses: formValue.annualExpenses || undefined
    };

    const editing = this.editingProperty();
    const operation = editing
      ? this.propertyService.updateProperty(editing.id, request)
      : this.propertyService.createProperty(request);

    operation.subscribe({
      next: () => {
        this.loadProperties();
        this.closePropertyForm();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to save property');
        this.isSubmitting.set(false);
      }
    });
  }

  deleteProperty(property: PropertyResponse): void {
    this.confirmDialog.confirmDelete(property.name, 'This will also delete all associated mortgages.')
      .pipe(
        filter(confirmed => confirmed),
        switchMap(() => this.propertyService.deleteProperty(property.id))
      )
      .subscribe({
        next: () => this.loadProperties(),
        error: () => this.error.set('Failed to delete property')
      });
  }

  // Mortgage Form
  openAddMortgageForm(propertyId: string): void {
    this.selectedPropertyId.set(propertyId);
    this.editingMortgage.set(null);
    this.mortgageForm.reset({
      offsetBalance: 0,
      isFixed: false,
      repaymentType: 'principal_and_interest',
      isDeductible: false
    });
    this.showMortgageForm.set(true);
  }

  openEditMortgageForm(mortgage: MortgageResponse): void {
    this.selectedPropertyId.set(mortgage.propertyId);
    this.editingMortgage.set(mortgage);
    this.mortgageForm.patchValue({
      lender: mortgage.lender || '',
      loanName: mortgage.loanName || '',
      currentBalance: mortgage.currentBalance,
      offsetBalance: mortgage.offsetBalance,
      interestRate: mortgage.interestRate * 100, // Convert to percentage
      isFixed: mortgage.isFixed,
      fixedRateExpiry: mortgage.fixedRateExpiry || '',
      repaymentType: mortgage.repaymentType,
      isDeductible: mortgage.isDeductible
    });
    this.showMortgageForm.set(true);
  }

  closeMortgageForm(): void {
    this.showMortgageForm.set(false);
    this.editingMortgage.set(null);
    this.selectedPropertyId.set(null);
  }

  saveMortgage(): void {
    if (this.mortgageForm.invalid || this.isSubmitting()) return;

    const propertyId = this.selectedPropertyId();
    if (!propertyId) return;

    this.isSubmitting.set(true);
    const formValue = this.mortgageForm.value;

    const request: MortgageRequest = {
      propertyId: propertyId,
      lender: formValue.lender || undefined,
      loanName: formValue.loanName || undefined,
      currentBalance: formValue.currentBalance,
      offsetBalance: formValue.offsetBalance || 0,
      interestRate: formValue.interestRate / 100, // Convert from percentage
      isFixed: formValue.isFixed,
      fixedRateExpiry: formValue.fixedRateExpiry || undefined,
      repaymentType: formValue.repaymentType,
      isDeductible: formValue.isDeductible
    };

    const editing = this.editingMortgage();
    const operation = editing
      ? this.propertyService.updateMortgage(editing.id, request)
      : this.propertyService.createMortgage(request);

    operation.pipe(
      switchMap((mortgage: MortgageResponse) => {
        // Sync offset account if offset balance > 0
        if (request.offsetBalance && request.offsetBalance > 0) {
          return this.syncOffsetAccount(mortgage, request.offsetBalance);
        }
        return of(mortgage);
      })
    ).subscribe({
      next: () => {
        this.loadMortgagesForProperty(propertyId);
        this.loadProperties(); // Refresh equity calculations
        this.loadCashAccounts(); // Refresh cash accounts
        this.closeMortgageForm();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to save mortgage');
        this.isSubmitting.set(false);
      }
    });
  }

  /**
   * Sync offset account in Cash & Liabilities when a mortgage has offset > 0.
   * Creates a new offset account if none exists, or updates existing one.
   */
  private syncOffsetAccount(mortgage: MortgageResponse, offsetBalance: number) {
    // Find existing offset account linked to this mortgage
    const existingOffset = this.cashAccounts().find(
      a => a.accountType === 'offset' && a.linkedMortgageId === mortgage.id
    );

    // Find the property name for the account name
    const property = this.properties().find(p => p.id === mortgage.propertyId);
    const lenderName = mortgage.lender || 'Mortgage';
    const propertyName = property?.name || 'Property';
    const accountName = `${lenderName} Offset - ${propertyName}`;

    const cashRequest: CashAccountRequest = {
      accountName: accountName,
      institution: mortgage.lender,
      accountType: 'offset',
      balance: offsetBalance,
      linkedMortgageId: mortgage.id
    };

    if (existingOffset) {
      return this.cashLiabilityService.updateCashAccount(existingOffset.id, cashRequest).pipe(
        catchError(() => of(null)) // Silent fail
      );
    } else {
      return this.cashLiabilityService.createCashAccount(cashRequest).pipe(
        catchError(() => of(null)) // Silent fail
      );
    }
  }

  deleteMortgage(mortgage: MortgageResponse): void {
    const mortgageName = mortgage.loanName || mortgage.lender || 'this mortgage';
    this.confirmDialog.confirmDelete(mortgageName)
      .pipe(
        filter(confirmed => confirmed),
        switchMap(() => this.propertyService.deleteMortgage(mortgage.id))
      )
      .subscribe({
        next: () => {
          this.loadMortgagesForProperty(mortgage.propertyId);
          this.loadProperties();
        },
        error: () => this.error.set('Failed to delete mortgage')
      });
  }
}
