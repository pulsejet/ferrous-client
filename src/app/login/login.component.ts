import { Component, OnInit } from '@angular/core';
import * as $ from 'jquery';
import { DataService } from '../data.service';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  public username: string;
  public password: string;

  public usernameError = '';
  public passwordError = '';

  constructor(
    public dataService: DataService,
    public titleService: Title,
  ) {
    this.titleService.setTitle('Ferrous Login');
  }

  ngOnInit() {
  }

  continueLogin() {
    this.clearMessages();

    if (this.username == null || this.username === '') {
      this.usernameError = 'Username cannot be blank';
      this.addFormError('#user_username');
    } else if (this.password == null || this.password === '') {
      this.passwordError = 'Password cannot be blank';
      this.addFormError('#user_password');
    } else {
      this.dataService.Login(this.username, this.password).subscribe(() => {
        $('#dialog').removeClass('dialog-effect-in').removeClass('shakeit');
        $('#dialog').addClass('dialog-effect-out');
        $('#successful_login').addClass('active');
        setTimeout(() => {
          this.dataService.RefreshAPISpec().subscribe(api => {
            this.dataService._API_SPEC = api;
            this.dataService.loggedIn = true;
          });
        }, 300);

        this.dataService.GetCurrentUser().subscribe(result => {
          this.dataService.identity = result;
        });

      }, () => {
        this.addFormError('#user_password');
        this.passwordError = 'The password is invalid';
      });
    }
  }

  addFormError(formRow) {
    $(formRow).parents('.form-group').addClass('has-error');
    $('#dialog').removeClass('dialog-effect-in');
    $('#dialog').addClass('shakeit');
    setTimeout(() => {
      $('#dialog').removeClass('shakeit');
    }, 300);
  }

  clearMessages() {
    this.usernameError = this.passwordError = '';
    $('#login_form').find('.form-group').removeClass('has-error');
  }

}
