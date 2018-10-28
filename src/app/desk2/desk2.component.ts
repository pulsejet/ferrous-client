import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { DataService } from '../data.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ContingentArrival, Link, Contingent, Building } from '../interfaces';

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
        this.ca = result;
        if (this.ca.maleOnSpot == null && this.ca.femaleOnSpot == null) {
          this.ca.femaleOnSpot = this.ca.maleOnSpot = 0;
        } else {
          this.onSpotAlreadyApproved = true;
        }

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
      this.dataService.FireLink<Building[]>(
        this.dataService.GetLink(this.ca.links, 'buildings-min')
      ).subscribe(buildings => {
        /* Find the building we want */
        this.dataService.hostelLinks = {
          M: null,
          F: null,
          cano: this.ca.contingentArrivalNo
        };

        /* Get male building */
        const maleBuilding = buildings.find(b => b.location === this.dataService.hostelKeys.M.toUpperCase());
        if (maleBuilding !== null) {
          this.dataService.hostelLinks.M = this.dataService.GetLinkSelf(maleBuilding.links);
        }

        /* Get female building */
        const femaleBuilding = buildings.find(b => b.location === this.dataService.hostelKeys.F.toUpperCase());
        if (femaleBuilding !== null) {
          this.dataService.hostelLinks.F = this.dataService.GetLinkSelf(femaleBuilding.links);
        }

        /* Show error */
        if (this.dataService.hostelLinks[sex] === null) {
          alert('You seem to have chosen a wrong hostel');
        }

        /* Skip to allotment */
        this.dataService.NavigateRoomLayout(
          this.dataService.hostelLinks[sex],
          this.dataService.hostelKeys[sex],
          this.ca.contingentLeaderNo
        );
      });
    }
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

}
