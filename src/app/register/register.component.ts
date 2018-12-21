import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { DataService } from '../data.service';
import { ContingentArrival, CAPerson } from '../interfaces';
import { checkDuplicates } from '../helpers';

interface FormPerson {
  mino: string;
  name: string;
  ctrl: string;
  sno: number;
  sex: string;
}

interface FormAPI {
  contingentLeaderNo: string;
  fillerMiNo: string;
  mino: string;
  male: number;
  female: number;
  maleOnSpotDemand: number;
  femaleOnSpotDemand: number;
  minos: string[];
}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {

  public firstFormGroup: FormGroup;
  public secondFormGroup: FormGroup;
  public thirdFormGroup: FormGroup;

  public caPIN: number;
  public submitting = false;

  public details: FormPerson[] = [];

  public nmale = 0;
  public nfemale = 0;
  public validation: ContingentArrival;
  public validationError: string;
  public validationDupes: boolean;

  private minoValidPattern = Validators.pattern('MI-[A-Za-z0-9!@#$%^&]{1,3}-[0-9]{3,4}');

  constructor(
    private _formBuilder: FormBuilder,
    public dataService: DataService,
    ) {}

  ngOnInit() {
    this.firstFormGroup = this._formBuilder.group({
      clno: ['MI-', this.minoValidPattern],
      mino: ['MI-', this.minoValidPattern],
      nmale: [0, Validators.required],
      nfemale: [0, Validators.required]
    });

    this.secondFormGroup = this._formBuilder.group({});

    this.thirdFormGroup = this._formBuilder.group({
      maleOnSpotDemand: [0, Validators.required],
      femaleOnSpotDemand: [0, Validators.required]
    });
  }

  /** Construct boxes */
  constructDetails(e: any) {
    if (e.selectedIndex === 1) {
      /* Details Page */
      const nmale: number = this.firstFormGroup.get('nmale').value;
      const nfemale: number = this.firstFormGroup.get('nfemale').value;

      /* Do not frustrate people */
      if (nmale === this.nmale && nfemale === this.nfemale) {
        return;
      } else {
        if (nmale + nfemale > 10) {
          alert('Please make sure the number of people are accurate. All inputs might be cleared if you change them!');
        }
      }

      /* Clear current */
      const prevLength = this.details.length;
      this.details = [];
      const controls: any = {};

      this.nmale = nmale;
      this.nfemale = nfemale;

      /* Create boxes for each */
      for (let i = 0; i < nmale + nfemale; i++) {
        const ctrl = 'person' + i.toString();

        /* Preserve values after changes */
        let defaultValue = 'MI-';
        if (prevLength > i) {
          defaultValue = this.secondFormGroup.get(ctrl).value;
        }

        /* Add the control */
        controls[ctrl] = [defaultValue, this.minoValidPattern];
        this.details.push({
          sno: i,
          ctrl: ctrl,
          sex: (i >= nmale) ? 'F' : 'M',
        } as FormPerson);
      }

      /* Build */
      this.secondFormGroup = this._formBuilder.group(controls);

    } else if (e.selectedIndex === 3) {
      /* Validation Page */
      this.submitting = true;
      this.dataService.FireLink<ContingentArrival>(
        this.dataService.GetLink(
          this.dataService.GetAPISpec(), 'validatepostform1'), this.getRequest()
      ).subscribe(result => {
        this.submitting = false;
        this.validation = result;
        this.validationError = null;

        /* Check for duplicates */
        this.validationDupes = checkDuplicates(result);
      }, error => {
        this.submitting = false;
        this.validationError = error.error.message;
      });
    }
  }

  /** Get placeholder for name */
  getPlaceholder(person: FormPerson) {
    return `Person #${person.sno + 1} (${person.sex === 'M' ? 'Male' : 'Female'})`;
  }

  submit() {
    this.submitting = true;
    this.dataService.FireLink<ContingentArrival>(
      this.dataService.GetLink(
        this.dataService.GetAPISpec(), 'postform1'), this.getRequest()
    ).subscribe(result => {
        this.submitting = false;
        this.caPIN = result.contingentArrivalNo;
      }, error => {
        this.submitting = false;
        alert('An error occured - ' + error.error.message);
      });
  }

  getRequest(): FormAPI {
    const request = {} as FormAPI;
    request.contingentLeaderNo = this.firstFormGroup.get('clno').value;
    request.fillerMiNo = this.firstFormGroup.get('mino').value;
    request.male = this.firstFormGroup.get('nmale').value;
    request.female = this.firstFormGroup.get('nfemale').value;
    request.minos = [];
    request.maleOnSpotDemand = this.thirdFormGroup.get('maleOnSpotDemand').value;
    request.femaleOnSpotDemand = this.thirdFormGroup.get('femaleOnSpotDemand').value;

    for (const person of this.details) {
      request.minos.push(this.secondFormGroup.get(person.ctrl).value);
    }
    return request;
  }

  getErrorClass(caPerson: CAPerson) {
    return (caPerson.flags === '') ? 'ca-valid' : 'ca-error';
  }

  hasInvalidMFCount() {
    if (!this.validation) { return false; }
    const c = (s: string) => this.validation.caPeople.filter(p => p.sex.toLowerCase().includes(s)).length;
    return (c('m') !== this.nmale || c('f') !== this.nfemale);
  }

  hasValidationErrors() {
    for (const p of this.validation.caPeople) {
      if (p.flags !== '') { return true; }
    }
    return false;
  }

  hasSome() {
    return this.validation.caPeople.length > 0;
  }

  hasSelf() {
    return this.validation.caPeople.map(m => m.mino).includes(
      this.firstFormGroup.get('mino').value
    );
  }

  hasOnspot() {
    return this.validation.maleOnSpotDemand + this.validation.femaleOnSpotDemand > 0;
  }

}
