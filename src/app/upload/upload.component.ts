import { Component, Output, EventEmitter, Input } from '@angular/core';
import { HttpClient, HttpRequest, HttpEventType } from '@angular/common/http';
import { DataService } from '../data.service';
import { Room, Link } from '../interfaces';

@Component({
  selector: 'app-upload-component',
  templateUrl: './upload.component.html'
})
export class UploadComponent {
  public progress: number;

  @Output() public uploaded = new EventEmitter<Room[]>();
  @Output() public progressChange = new EventEmitter<number>();
  @Input() public link: Link;

  constructor(
    private http: HttpClient,
    public dataService: DataService,
  ) { }

  upload(files) {
    if (files.length === 0) {
      return;
    }

    const formData = new FormData();

    for (const file of files) {
      formData.append(file.name, file);
    }

    const uploadReq = new HttpRequest(this.link.method, this.link.href, formData, {
      reportProgress: true,
    });

    this.http.request(uploadReq).subscribe(event => {
      if (event.type === HttpEventType.UploadProgress) {
        this.progressChange.emit(Math.round(100 * event.loaded / event.total));
      } else if (event.type === HttpEventType.Response) {
        const body: Room[] = event.body as Room[];
        this.uploaded.emit(body);
      }
    });
  }
}
