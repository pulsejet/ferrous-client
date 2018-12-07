import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-color-legend',
  templateUrl: './color-legend.component.html',
  styleUrls: ['./color-legend.component.css']
})
export class ColorLegendComponent implements OnInit {

  public sticky = false;

  constructor() { }

  ngOnInit() {
  }

}
