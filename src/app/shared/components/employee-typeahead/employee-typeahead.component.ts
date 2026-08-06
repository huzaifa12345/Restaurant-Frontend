import { Component, DestroyRef, OnInit, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { EmployeeDto } from '../../../core/models/api.models';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-employee-typeahead',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatButtonModule
  ],
  templateUrl: './employee-typeahead.component.html',
  styleUrl: './employee-typeahead.component.scss'
})
export class EmployeeTypeaheadComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly label = input('Employee');
  readonly activeOnly = input(true);
  /** Emit selected employee id, or null when cleared / All. */
  readonly employeeIdChange = output<string | null>();

  readonly searchControl = new FormControl<string>('', { nonNullable: true });
  readonly options = signal<EmployeeDto[]>([]);
  readonly loading = signal(false);
  readonly selectedId = signal<string | null>(null);

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap(term => {
          this.loading.set(true);
          const text =
            typeof term === 'string' ? term.trim() : ((term as EmployeeDto | null)?.name ?? '').trim();
          return this.api.getEmployees({
            page: 1,
            pageSize: 20,
            name: text || null,
            activeOnly: this.activeOnly()
          });
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: result => {
          this.loading.set(false);
          this.options.set(result.items);
        },
        error: () => {
          this.loading.set(false);
          this.options.set([]);
        }
      });

    this.searchControl.setValue('');
  }

  displayFn = (value: EmployeeDto | string | null): string => {
    if (!value) {
      return '';
    }
    return typeof value === 'string' ? value : value.name;
  };

  onOptionSelected(event: MatAutocompleteSelectedEvent): void {
    const employee = event.option.value as EmployeeDto;
    this.selectedId.set(employee.id);
    this.searchControl.setValue(employee.name, { emitEvent: false });
    this.employeeIdChange.emit(employee.id);
  }

  clear(): void {
    this.selectedId.set(null);
    this.searchControl.setValue('');
    this.employeeIdChange.emit(null);
  }

  onBlur(): void {
    if (!this.selectedId() && this.searchControl.value.trim()) {
      this.searchControl.setValue('', { emitEvent: true });
    }
  }
}
