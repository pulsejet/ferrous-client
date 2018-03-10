import { Component, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { DataService } from '../data.service';

/* Homepage */
@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
})
export class HomeComponent {
    constructor(private activatedRoute: ActivatedRoute,
        private titleService: Title,
        public router: Router,
        public dataService: DataService,
        @Inject('BASE_URL') baseUrl: string,
    ) {
        this.titleService.setTitle('Home');
    }
    enteredCL: string;

    FindContingent(clno: string) {
        this.dataService.NavigateContingentDetails(
            this.dataService.FillURITemplate(
                this.dataService.GetLink(this.dataService.GetAPISpec(), 'find_contingent'),
                { id: clno }
            )
        );
    }
}
