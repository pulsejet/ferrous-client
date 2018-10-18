import { Component, OnInit } from '@angular/core';
import { Room, Link } from '../interfaces';
import { DataService } from '../data.service';

@Component({
  selector: 'app-upload-sheet',
  templateUrl: './upload-sheet.component.html',
  styleUrls: ['./upload-sheet.component.css']
})
export class UploadSheetComponent implements OnInit {

  public uploadLink: Link;
  public progress = 0;
  public result: Room[];

  constructor(
    public dataService: DataService,
  ) {
    this.uploadLink = this.dataService.GetLink(
      this.dataService.GetAPISpec(), 'upload-sheet'
    );
  }

  ngOnInit() {
  }

  /** Answer the server's response */
  sheetUploaded(event: Room[]) {
    this.result = event;
  }

  /** Show spinner when progressing */
  progressChange(progress: number) {
    this.progress = progress;
  }

  /** Returns true if the room was not found */
  isRoomBad(room: Room) {
    return room.remark === 'NOT FOUND';
  }

}
