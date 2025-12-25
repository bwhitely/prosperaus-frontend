import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProfileService, TaxResidency, OnboardingRequest } from '../../core/services/profile.service';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnboardingComponent {
  private fb = inject(FormBuilder);
  private profileService = inject(ProfileService);
  private router = inject(Router);

  currentStep = signal(1);
  totalSteps = 3;
  isSubmitting = signal(false);
  error = signal<string | null>(null);

  onboardingForm: FormGroup = this.fb.group({
    displayName: ['', [Validators.required, Validators.maxLength(100)]],
    dateOfBirth: ['', Validators.required],
    taxResidency: ['RESIDENT' as TaxResidency, Validators.required],
    marginalTaxRate: [null as number | null],
    hasPrivateHealthInsurance: [false],
    retirementAge: [67, [Validators.min(55), Validators.max(100)]]
  });

  taxResidencyOptions: { value: TaxResidency; label: string; description: string }[] = [
    {
      value: 'RESIDENT',
      label: 'Australian Resident',
      description: 'You are an Australian resident for tax purposes'
    },
    {
      value: 'NON_RESIDENT',
      label: 'Non-Resident',
      description: 'You are a foreign resident for tax purposes'
    },
    {
      value: 'WORKING_HOLIDAY',
      label: 'Working Holiday Maker',
      description: 'You are in Australia on a working holiday visa'
    }
  ];

  taxBrackets = [
    { rate: 0, label: 'Nil (under $18,200)', value: 0 },
    { rate: 0.16, label: '16% ($18,201 - $45,000)', value: 0.16 },
    { rate: 0.30, label: '30% ($45,001 - $135,000)', value: 0.30 },
    { rate: 0.37, label: '37% ($135,001 - $190,000)', value: 0.37 },
    { rate: 0.45, label: '45% ($190,001+)', value: 0.45 }
  ];

  nextStep(): void {
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.update(step => step + 1);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(step => step - 1);
    }
  }

  canProceedFromStep1(): boolean {
    const displayName = this.onboardingForm.get('displayName');
    const dateOfBirth = this.onboardingForm.get('dateOfBirth');
    return displayName?.valid === true && dateOfBirth?.valid === true;
  }

  canProceedFromStep2(): boolean {
    const taxResidency = this.onboardingForm.get('taxResidency');
    return taxResidency?.valid === true;
  }

  async onSubmit(): Promise<void> {
    if (this.onboardingForm.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    const formValue = this.onboardingForm.value;
    const request: OnboardingRequest = {
      displayName: formValue.displayName,
      taxResidency: formValue.taxResidency,
      dateOfBirth: formValue.dateOfBirth,
      marginalTaxRate: formValue.marginalTaxRate,
      hasPrivateHealthInsurance: formValue.hasPrivateHealthInsurance,
      retirementAge: formValue.retirementAge
    };

    this.profileService.completeOnboarding(request).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to complete onboarding. Please try again.');
        this.isSubmitting.set(false);
      }
    });
  }
}
