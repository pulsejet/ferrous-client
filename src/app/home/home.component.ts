import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { DataService } from '../data.service';

/* Homepage */
@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
})
export class HomeComponent {
    constructor(
        private titleService: Title,
        public router: Router,
        public dataService: DataService,
    ) {
        this.titleService.setTitle('Home');
    }
    enteredCL: string;
    enteredDesk1: string;

    FindContingent(clno: string) {
        this.dataService.NavigateContingentDetails(
            this.dataService.FillURITemplate(
                this.dataService.GetLink(this.dataService.GetAPISpec(), 'find_contingent'),
                { id: clno }
            )
        );
    }

    Desk1(pin: string) {
        this.dataService.NavigateDesk1(this.dataService.FillURITemplate(
            this.dataService.GetLink(this.dataService.GetAPISpec(), 'desk1'),
            { id: pin}
        ));
    }
}
