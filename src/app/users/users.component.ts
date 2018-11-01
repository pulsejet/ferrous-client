import { Component, OnInit } from '@angular/core';
import { DataService } from '../data.service';
import { Title } from '@angular/platform-browser';
import { Building } from '../interfaces';

interface FerrousIdentity {
  username: string;
  password: string;
  elevation: number;
  privileges: number[];
  locations: string[];
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
  public buildings: Building[];

  /** Current password */
  public password = '';

  constructor(
    public dataService: DataService,
    titleService: Title,
  ) {
    titleService.setTitle('Manage Users');
  }

  ngOnInit() {
    /* Fill users */
    this.dataService.FireLink<FerrousIdentity[]>(
      this.dataService.GetLink(this.dataService.GetAPISpec(), 'get-all-users')
    ).subscribe(result => {
      this.identities = result;
    });

    /* Fill privilege list */
    this.dataService.FireLink<any>(
      this.dataService.GetLink(this.dataService.GetAPISpec(), 'all-privileges')
    ).subscribe(result => {
      this.privileges = result;
    });

    /* Fill hostel list */
    this.dataService.GetAllBuildingsExtended(
      this.dataService.GetLink(this.dataService.GetAPISpec(), 'mark_buildings')
    ).subscribe(result => {
      this.buildings = result.data;
    });
  }

  public numberKeys(obj: any): number[] {
    return Object.keys(obj).map(m => Number(m));
  }

  add(): void {
    this.identities.push({} as FerrousIdentity);
  }

  remove(id: FerrousIdentity): void {
    const i = this.identities.findIndex(f => f === id);
    this.identities.splice(i, 1);
  }

  duplicate(id: FerrousIdentity): void {
    const dup = JSON.parse(JSON.stringify(id)) as FerrousIdentity;
    dup.username += ' - Copy';
    this.identities.push(dup);
  }

  submit() {
    if (this.password === '') {
      alert('Enter your existing password to modify users!');
      return;
    }

    this.dataService.FireLink(
      this.dataService.GetLink(this.dataService.GetAPISpec(), 'post-all-users'),
      this.identities, { password: this.password }
    ).subscribe(() => {
      alert('Updated successfully!');
    }, (error) => {
      const message = (error.error != null && error.error.message != null) ? error.error.message : '';
      alert(`Updated FAILED! Check your password! ${message}`);
    });
  }

}
