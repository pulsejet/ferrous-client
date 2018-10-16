import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { DataService } from '../data.service';
import { ContingentArrival, CAPerson } from '../interfaces';

interface FormPerson {
  mino: string;
  name: string;
  ctrl: string;
  sno: number;
  sex: string;
}

interface FormAPI {
  contingentLeaderNo: string;
  mino: string;
  male: number;
  female: number;
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

  public caPIN: number;
  public submitting = false;

  public details: FormPerson[] = [];

  public nmale = 0;
  public nfemale = 0;
  public validation: ContingentArrival;

  private minoValidPattern = Validators.required; // Validators.pattern('MI-[A-Za-z]{3}-[0-9]{3}');

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
  }

  /** Construct boxes */
  constructDetails(e: any) {
    if (e.selectedIndex === 1) {
      const nmale: number = this.firstFormGroup.get('nmale').value;
      const nfemale: number = this.firstFormGroup.get('nfemale').value;

      /* Do not frustrate people */
      if (nmale === this.nmale && nfemale === this.nfemale) {
        return;
      } else {
        if (nmale + nfemale > 10) {
          alert('Please make sure the number of people are accurate. All inputs will be cleared if you change them!');
        }
      }

      /* Clear current */
      this.details = [];
      const controls: any = {};

      this.nmale = nmale;
      this.nfemale = nfemale;

      /* Create boxes for each */
      for (let i = 0; i < nmale + nfemale; i++) {
        const ctrl = 'person' + i.toString();
        controls[ctrl] = ['MI-', this.minoValidPattern];
        this.details.push({
          sno: i,
          ctrl: ctrl,
          sex: (i >= nmale) ? 'F' : 'M',
        } as FormPerson);
      }

      /* Build */
      this.secondFormGroup = this._formBuilder.group(controls);
    } else if (e.selectedIndex === 2) {
      this.submitting = true;
      this.dataService.FireLink<ContingentArrival>(
        this.dataService.GetLink(
          this.dataService.GetAPISpec(), 'validatepostform1'), this.getRequest()
      ).subscribe(result => {
        this.submitting = false;
        this.validation = result;
      }, error => {
        this.submitting = false;
        alert('An error occured - ' + error.error.message);
      });
    }
  }

  /** Get placeholder for name */
  getPlaceholder(person: FormPerson) {
    return `Person #${person.sno} (${person.sex})`;
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
    request.male = this.firstFormGroup.get('nmale').value;
    request.female = this.firstFormGroup.get('nfemale').value;
    request.minos = [];

    for (const person of this.details) {
      request.minos.push(this.secondFormGroup.get(person.ctrl).value);
    }
    return request;
  }

  getErrorClass(caPerson: CAPerson) {
    return (caPerson.flags === '') ? 'ca-valid' : 'ca-error';
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

}
