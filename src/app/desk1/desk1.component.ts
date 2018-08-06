import { Component, OnInit } from '@angular/core';
import { ContingentArrival, Link, CAPerson, Person } from '../interfaces';
import { DataService } from '../data.service';
import { Router, Params, ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-desk1',
  templateUrl: './desk1.component.html',
  styleUrls: ['./desk1.component.css']
})
export class Desk1Component implements OnInit {

  public ca: ContingentArrival;
  public urlLink: Link;
  public enteredMINo: string;

  constructor(
    private activatedRoute: ActivatedRoute,
    private titleService: Title,
    public dataService: DataService,
    public router: Router,
    public snackBar: MatSnackBar,
  ) {
    this.titleService.setTitle('Desk 1');
  }

  ngOnInit() {
    /* Get URL parameters */
    this.activatedRoute.params.subscribe((params: Params) => {
        this.urlLink = this.dataService.DecodeObject(params['link']);
        this.dataService.FireLink<ContingentArrival>(this.urlLink).subscribe(result => {
        this.ca = result;
        }, error => console.error(error));
    });
  }

  /* Open person component */
  openPerson(person: Person) {
    if (!person) { alert('Person does not exist'); return; }
    if (!this.dataService.CheckIfLink(person.links, 'self')) { alert('No elevation!'); }
    this.dataService.NavigatePersonDetails(this.dataService.GetLinkSelf(person.links));
  }

  /** Set counts to equal computed */
  copyCount() {
    this.ca.male = this.ca.peopleMale;
    this.ca.female = this.ca.peopleFemale;
  }

  /** Add a new CA Person */
  addCAPerson() {
    const caperson = {} as CAPerson;
    caperson.mino = this.enteredMINo;
    this.dataService.FireLink<CAPerson>(
      this.dataService.GetLink(this.ca.links, 'add_caperson'), caperson).subscribe((result) => {
      this.ca.caPeople.push(result);
      this.updatePeopleCount(result, 1);
      this.enteredMINo = '';
    });
  }

  /** Remove a CA Person */
  delCAPerson(caPerson: CAPerson) {
    this.dataService.FireLink(this.dataService.GetLinkDelete(caPerson.links)).subscribe(() => {
      this.updatePeopleCount(caPerson, -1);
      this.ca.caPeople.splice(this.ca.caPeople.indexOf(caPerson), 1);
    });
  }

  /** Update effect of change of one CAPerson */
  updatePeopleCount(caPerson: CAPerson, add: number) {
    if (caPerson.person) {
      if (caPerson.person.sex.toUpperCase() === 'M') {
        this.ca.peopleMale += add;
      } else if (caPerson.person.sex.toUpperCase() === 'F') {
        this.ca.peopleFemale += add;
      }
    }
  }

  /** Approve the CA */
  approve() {
    this.dataService.FireLink(this.dataService.GetLink(this.ca.links, 'approve'), this.ca).subscribe(() => {
      this.snackBar.open('Subcontingent Approved', 'Dismiss', {
        duration: 2000,
      });
      this.ca.approved = true;
    }, () => {
      this.snackBar.open('Approving Failed', 'Dismiss', {
        duration: 2000,
      });
    });
  }

  /** Open the contingent */
  openContingent() {
    this.dataService.NavigateContingentDetails(this.dataService.GetLink(this.ca.links, 'contingent'), false);
  }

}
