import { Component, OnInit } from '@angular/core';
import { DataService } from '../data.service';
import { Building, Link } from '../interfaces';

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.css']
})
export class StatisticsComponent implements OnInit {

  public buildings: Building[];
  public links: Link[];

  constructor(
    public dataService: DataService,
  ) { }

  ngOnInit() {
    this.dataService.GetAllBuildingsExtended(
      this.dataService.GetLink(this.dataService.GetAPISpec(), 'mark_buildings')
    ).subscribe(result => {
      this.buildings = result.data;
      this.links = result.links;
    });
  }

  getTotalAvailable() {
    return this.sum(this.buildings.map(b => b.capacityEmpty));
  }

  getTotalFilled() {
    return this.sum(this.buildings.map(b => b.capacityFilled));
  }

  getTotalNR() {
    return this.sum(this.buildings.map(b => b.capacityNotReady));
  }

  getRoomsTotal() {
    return this.sum(this.buildings.map(b => b.roomsTotal));
  }

  getRoomsEmpty() {
    return this.sum(this.buildings.map(b => b.roomsEmpty));
  }

  getRoomsPartial() {
    return this.sum(this.buildings.map(b => b.roomsPartial));
  }

  getRoomsFilled() {
    return this.sum(this.buildings.map(b => b.roomsFilled));
  }

  getRoomsNR() {
    return this.sum(this.buildings.map(b => b.roomsNotReady));
  }

  sum(arr: number[]) {
    return arr.reduce((a, b) => a + b, 0);
  }

}
