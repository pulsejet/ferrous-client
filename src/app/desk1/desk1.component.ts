import { Component, OnInit } from '@angular/core';
import { ContingentArrival, Link, CAPerson, Person } from '../interfaces';
import { DataService } from '../data.service';
import { Router, Params, ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { MatSnackBar } from '@angular/material/snack-bar';
import { checkDuplicates } from '../helpers';

@Component({
  selector: 'app-desk1',
  templateUrl: './desk1.component.html',
  styleUrls: ['./desk1.component.css']
})
export class Desk1Component implements OnInit {

  public ca: ContingentArrival;
  public urlLink: Link;
  public enteredMINo: string;
  public filler: Person;
  public badFiller = false;

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
          this.fillFromCA(result);
        }, error => console.error(error));
    });
  }

  /** Fill global object from result */
  fillFromCA(result: ContingentArrival) {
    /* Set globals */
    this.ca = result;
    checkDuplicates(this.ca);

    /** Fill in filler MI no. */
    this.dataService.getPersonWithFallback(result.fillerMiNo).subscribe(p => {
      this.filler = p;
      this.badFiller = this.filler.name.includes('[Unreg');
    }, () => {
      this.badFiller = true;
      this.filler = { name: 'UNKNOWN'} as Person;
    });

    /** Fill in people for missing ones */
    for (const caPerson of this.ca.caPeople) {
      if (!caPerson.person) {
        this.fillPersonForward(caPerson);
      }
    }
  }

  /** Make a call to the forwarding API to fill a person */
  fillPersonForward(caPerson: CAPerson) {
    this.dataService.getPersonForward(caPerson.mino).subscribe(person => {
      caPerson.person = person;
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

      /* Update from forward API */
      if (!result.person) {
        this.fillPersonForward(result);
      }
    }, () => {
      alert('Adding failed! Maybe the contingent is already approved!');
    });
  }

  /** Remove a CA Person */
  delCAPerson(caPerson: CAPerson) {
    this.dataService.FireLink(this.dataService.GetLinkDelete(caPerson.links)).subscribe(() => {
      this.updatePeopleCount(caPerson, -1);
      this.ca.caPeople.splice(this.ca.caPeople.indexOf(caPerson), 1);
    }, () => {
      alert('Deleting failed! Maybe the contingent is already approved!');
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
    if (checkDuplicates(this.ca) && !confirm('This subcontingent has duplicates. Approve?')) {
      return;
    }

    if (Number(Number(this.ca.male) + Number(this.ca.female)) !== Number(this.ca.caPeople.length)) {
      alert('Counts of MI numbers do not match with filled. Please correct this before proceeding!');
      return;
    }

    if (this.ca.caPeople.some(m => m.flags !== '') && !confirm('This subcontingent has warnings. Approve?')) {
      return;
    }

    this.dataService.FireLink<ContingentArrival>(
      this.dataService.GetLink(this.ca.links, 'approve'), this.ca).subscribe(ca => {
      this.snackBar.open('Subcontingent Approved', 'Dismiss', {
        duration: 2000,
      });
      this.fillFromCA(ca);
    }, () => {
      alert('Approving Failed!');
    });
  }

  /** Unapprove the CA */
  unapprove() {
    if (!confirm('Are you sure you want to unapprove this subcontingent?')) {
      return;
    }

    this.dataService.FireLink<ContingentArrival>(
      this.dataService.GetLink(this.ca.links, 'unapprove'), this.ca).subscribe(ca => {
      this.snackBar.open('Subcontingent Unapproved', 'Dismiss', {
        duration: 2000,
      });
      this.fillFromCA(ca);
    }, () => {
      alert('Unapproving Failed!');
    });
  }

  /** Open the contingent */
  openContingent() {
    this.dataService.NavigateContingentDetails(this.dataService.GetLink(this.ca.links, 'contingent'), false);
  }

  /** If the CA has onspot request */
  hasOnspot(ca: ContingentArrival) {
    return ca.femaleOnSpotDemand + ca.maleOnSpotDemand > 0;
  }

  /** Display string for onspot */
  getOnspotCount(ca: ContingentArrival) {
    return ca.femaleOnSpotDemand + ca.maleOnSpotDemand;
  }

}
