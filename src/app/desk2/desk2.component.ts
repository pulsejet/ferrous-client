import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { DataService } from '../data.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ContingentArrival, Link, Contingent, Person } from '../interfaces';

@Component({
  selector: 'app-desk2',
  templateUrl: './desk2.component.html',
  styleUrls: ['./desk2.component.css']
})
export class Desk2Component implements OnInit {

  public ca: ContingentArrival;
  public contingent: Contingent;
  public urlLink: Link;
  public onSpotAlreadyApproved = false;
  public filler: Person;
  public badFiller = false;

  constructor(
    private activatedRoute: ActivatedRoute,
    private titleService: Title,
    public dataService: DataService,
    public router: Router,
    public snackBar: MatSnackBar,
  ) {
    this.titleService.setTitle('Desk 2');
  }

  ngOnInit() {
    /* Get URL parameters */
    this.activatedRoute.params.subscribe((params: Params) => {
      this.urlLink = this.dataService.DecodeObject(params['link']);
      this.dataService.FireLink<ContingentArrival>(this.urlLink).subscribe(result => {
        if (result.maleOnSpot == null && result.femaleOnSpot == null) {
          result.femaleOnSpot = result.maleOnSpot = 0;
        } else {
          this.onSpotAlreadyApproved = true;
        }

        this.ca = result;

        /** Fill in filler MI no. */
        this.dataService.getPersonWithFallback(result.fillerMiNo).subscribe(p => {
          this.filler = p;
          this.badFiller = this.filler.name.includes('[Unreg');
        }, () => {
          this.badFiller = true;
          this.filler = { name: 'UNKNOWN'} as Person;
        });

        if (this.ca.links && this.dataService.CheckIfLink(this.ca.links, 'contingent')) {
          this.dataService.FireLink<Contingent>(
            this.dataService.GetLink(this.ca.links, 'contingent')).subscribe(contingent => {
            this.contingent = contingent;
          });
        }

      }, error => console.error(error));
    });
  }

  /** Start room allocation */
  allocate(sex: string = null) {
    if (sex == null) {
      this.dataService.NavigateLayoutSelect(this.ca, this.ca.contingentLeaderNo);
    } else {
      this.dataService.NavigateHostelKeySex(sex, this.ca);
    }
  }

  /** Navigate to hostel */
  hostel(loc: string) {
    this.dataService.NavigateHostelByLocation(loc, this.ca);
  }

  /** Open the contingent */
  openContingent() {
    this.dataService.NavigateContingentDetails(this.dataService.GetLink(this.ca.links, 'contingent'), false);
  }

  /** PUT to update on spot */
  approveOnSpot(all: boolean = false) {
    if (all) {
      this.ca.maleOnSpot = this.ca.maleOnSpotDemand;
      this.ca.femaleOnSpot = this.ca.femaleOnSpotDemand;
    }
    this.dataService.FireLink<ContingentArrival>(
      this.dataService.GetLinkUpdate(this.ca.links), this.ca).subscribe(() => {
        this.snackBar.open('On-Spot Approved', 'Dismiss', { duration: 2000 });
    }, () => {
      this.snackBar.open('Approving Failed', 'Dismiss', { duration: 2000 });
    });
  }

  /** Are rooms allotted? */
  allotted(): boolean {
    return this.ca.zeroAllot || (this.ca.roomAllocation && this.ca.roomAllocation.length > 0);
  }

}
