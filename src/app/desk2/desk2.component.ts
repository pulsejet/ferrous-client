import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { DataService } from '../data.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ContingentArrival, Link, Contingent } from '../interfaces';

@Component({
  selector: 'app-desk2',
  templateUrl: './desk2.component.html',
  styleUrls: ['./desk2.component.css']
})
export class Desk2Component implements OnInit {

  public ca: ContingentArrival;
  public contingent: Contingent;
  public urlLink: Link;

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
  allocate() {
    this.dataService.NavigateLayoutSelect(this.ca, this.ca.contingentLeaderNo);
  }

  /** Open the contingent */
  openContingent() {
    this.dataService.NavigateContingentDetails(this.dataService.GetLink(this.ca.links, 'contingent'), false);
  }

}
