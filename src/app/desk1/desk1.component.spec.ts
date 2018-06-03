import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { Desk1Component } from './desk1.component';

describe('Desk1Component', () => {
  let component: Desk1Component;
  let fixture: ComponentFixture<Desk1Component>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ Desk1Component ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(Desk1Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
