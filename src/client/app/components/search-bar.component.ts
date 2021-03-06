import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { Subject } from 'rxjs';
import { DiseaseService } from '../services/disease.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['../../assets/styles/search-bar.component.scss']
})
export class SearchBarComponent implements OnInit {

  @Output() onSearchClicked: EventEmitter<any> = new EventEmitter();
  @Output() onResultClicked: EventEmitter<any> = new EventEmitter();
  @Output() isLoadingStatus: EventEmitter<any> = new EventEmitter();

  // Binding values
  private diseases: Subject<any> = new Subject<any>();
  public searchedDisease: any = null;

  // Loading values
  private isLoading: boolean = false;
  private isResultEmpty: boolean = false;
  private isErrorPresent: boolean = false;

  lastToSearch: string = "";

  // Search results
  searchResults: any[] = new Array();

  constructor(private diseaseService: DiseaseService) { }

  ngOnInit() {

  }


  onInputChanged(value: string) {
    // Reset all variables
    this.isErrorPresent = false;
    this.isResultEmpty = false;
    this.diseases.next([]);

    // If i'm not currently searching
    if (!this.isLoading) {
      // Now I'm searching, loading!
      this.setLoadingStatus(true);

      // Send a request if value is not empty
      if (value != "") {
        this.diseaseService.searchDisease(value).subscribe((results: any) => {
          // No errors
          this.isErrorPresent = false;

          // Check for emptyness
          if (results[0]) {
            this.diseases.next(results);
          } else {
            this.diseases.next([]);
            this.isResultEmpty = true;
          }

          // Callback: check if there are pending requests
          this.setLoadingStatus(false);
          this.onSearchFinished();

        }, error => {
          // Error is present
          this.isErrorPresent = true;
          console.log(error);

          // Callback: check if there are pending requests
          this.setLoadingStatus(false);
          this.onSearchFinished();
        });
      }

      // Otherwise, just set it to empty
      else {
        this.setLoadingStatus(false);
        this.isResultEmpty = true;
        this.diseases.next([]);
      }
    }

    // For now I'm busy, register the event to search
    else {
      this.lastToSearch = value;
    }
  }


  onSearchFinished() {
    if (this.lastToSearch != "") {
      this.setLoadingStatus(true);
      this.isResultEmpty = false;

      this.diseaseService.searchDisease(this.lastToSearch).subscribe((results: any) => {
        // No errors
        this.isErrorPresent = false;

        // Check for emptyness
        if (results[0]) {
          this.diseases.next(results);
        } else {
          this.diseases.next([]);
          this.isResultEmpty = true;
        }

        // Callback: check if there are pending requests
        this.lastToSearch = "";
        this.setLoadingStatus(false);

      }, error => {
        // Error is present
        this.isErrorPresent = true;
        console.log(error);

        // Callback: check if there are pending requests
        this.lastToSearch = "";
        this.setLoadingStatus(false);
      });
    }
  }

  displayFn(disease: any): string {
    if (disease) {
      return disease.Name;
    } else {
      return "";
    }
  }

  setLoadingStatus(value: boolean) {
    this.isLoading = value;
    this.isLoadingStatus.emit([this.isLoading]);
  }

  resultClicked(value: any) {
    this.onResultClicked.emit([value]);
  }


  searchClicked() {
    this.onSearchClicked.emit([this.searchedDisease]);
  }

}