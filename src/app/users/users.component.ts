import { Component, OnInit } from '@angular/core';
import { DataService } from '../data.service';
import { Title } from '@angular/platform-browser';

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
    titleService: Title,
  ) {
    titleService.setTitle('Manage Users');
  }

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

  add(): void {
    this.identities.push({} as FerrousIdentity);
  }

  remove(id: FerrousIdentity): void {
    const i = this.identities.findIndex(f => f === id);
    this.identities.splice(i, 1);
  }

  submit() {
    const password = prompt('Enter your current password');
    this.dataService.FireLink(
      this.dataService.GetLink(this.dataService.GetAPISpec(), 'post-all-users'),
      this.identities, { password: password }
    ).subscribe(() => {
      alert('Updated successfully!');
    }, (error) => {
      const message = (error.error != null && error.error.message != null) ? error.error.message : '';
      alert(`Updated FAILED! ${message}`);
    });
  }

}
