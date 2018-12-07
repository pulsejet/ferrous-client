import { Component, OnInit } from '@angular/core';
import { Room, Link, Person } from '../interfaces';
import { DataService } from '../data.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-upload-sheet',
  templateUrl: './upload-sheet.component.html',
  styleUrls: ['./upload-sheet.component.css']
})
export class UploadSheetComponent implements OnInit {

  public uploadLink: Link;
  public peopleUploadLink: Link;
  public progress = 0;
  public result: Room[];
  public sampleLink: string;

  constructor(
    public dataService: DataService,
    public snackBar: MatSnackBar,
  ) {
    this.uploadLink = this.dataService.GetLink(
      this.dataService.GetAPISpec(), 'upload-sheet'
    );

    this.sampleLink = this.dataService.GetLink(
      this.dataService.GetAPISpec(), 'upload-sheet-sample'
    ).href;

    this.peopleUploadLink = this.dataService.GetLink(
      this.dataService.GetAPISpec(), 'upload-people-sheet'
    );
  }

  ngOnInit() {
  }

  /** Answer the server's response */
  sheetUploaded(event: Room[]) {
    this.result = event;
    this.snackBar.open('Room data updated', 'Dismiss', {
      duration: 2000
    });
  }

  peopleSheetUploaded(event: Person[]) {
    alert('People sheet updated');
    console.log(event);
  }

  /** Show spinner when progressing */
  progressChange(progress: number) {
    this.progress = progress;
  }

  /** Returns true if the room was not found */
  isRoomBad(room: Room) {
    return room.remark.startsWith('$');
  }

}
