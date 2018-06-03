import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { Desk2Component } from './desk2.component';

describe('Desk2Component', () => {
  let component: Desk2Component;
  let fixture: ComponentFixture<Desk2Component>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ Desk2Component ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(Desk2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
