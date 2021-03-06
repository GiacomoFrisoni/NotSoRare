import { Component, OnInit } from '@angular/core';
import { Disease } from '../../models/disease';
import { DiseaseHolderService } from '../../services/disease-holder.service';
import { ReferencesService } from '../../services/references.service';
import { Subscription } from '../../../../../node_modules/rxjs';

@Component({
  selector: 'app-references',
  templateUrl: './references.component.html',
  styleUrls: ['../../../assets/styles/references.component.scss']
})
export class ReferencesComponent implements OnInit {

  // Loading
  isReferencesLoaded = false;
  isReferencesEmpty = false;
  isAnyErrorPresent = false;

  // Binding
  references: any[];
  disease: Disease;

  subDiseaseHolder: Subscription;
  subReferencesService: Subscription;

  constructor(private referencesService: ReferencesService, private diseaseHolder: DiseaseHolderService) { }

  ngOnInit() {
    this.subDiseaseHolder = this.diseaseHolder.getDisease().subscribe(disease => {
      //Save for future reference
      if (disease != null) {
        this.disease = disease;

        // Get the experience
        this.subReferencesService = this.referencesService.getAllReferences(this.disease.general.CodDisease).subscribe((result: any) => {
          if (result) {
            this.references = result;
          } else {
            this.setOnErroStatus("Not valid type");
          }

          this.setWindowStatus(true, false, false);
        }, error => {
          this.setOnErroStatus("Error retriving reference");
          console.log(error);
        });
      }
    }, error => {
      this.setOnErroStatus("References not found");
      console.log(error);
    });

  }

  setWindowStatus(isReferencesLoaded, isReferencesEmpty, isAnyErrorPresent, message?) {
    this.isReferencesLoaded = isReferencesLoaded;
    this.isReferencesEmpty = isReferencesEmpty;
    this.isAnyErrorPresent = isAnyErrorPresent;

    if (message) console.log(message);
  }

  setOnErroStatus(message) {
    this.setWindowStatus(true, false, true, message);
  }

  ngOnDestroy() {
    // Reset all subscriptions
    this.unsubscribeAll();
  }

  private unsubscribeAll() {
    if (this.subDiseaseHolder) this.subDiseaseHolder.unsubscribe()
    if (this.subReferencesService) this.subReferencesService.unsubscribe()
  }
}
