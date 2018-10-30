import { Component, OnInit } from '@angular/core';
import { DataService } from '../data.service';

interface FerrousIdentity {
  username: string;
  password: string;
  elevation: number;
  privileges: number[];
}

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {

  public identities: FerrousIdentity[];

  public elevations = {
    0: 'SuperUser',
    1: 'Core Group',
    2: 'Coordinator',
    3: 'Organizer'
  };

  public privileges;

  constructor(
    public dataService: DataService,
  ) { }

  ngOnInit() {
    this.dataService.FireLink<FerrousIdentity[]>(
      this.dataService.GetLink(this.dataService.GetAPISpec(), 'get-all-users')
    ).subscribe(result => {
      this.identities = result;
    });

    this.dataService.FireLink<any>(
      this.dataService.GetLink(this.dataService.GetAPISpec(), 'all-privileges')
    ).subscribe(result => {
      this.privileges = result;
    });
  }

  public numberKeys(obj: any): number[] {
    return Object.keys(obj).map(m => Number(m));
  }

  submit() {
    console.log(this.identities);
  }

}
