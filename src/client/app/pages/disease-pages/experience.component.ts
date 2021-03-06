import { Component, OnInit } from '@angular/core';
import { Disease } from '../../models/disease';
import { DiseaseHolderService } from '../../services/disease-holder.service';
import { ExperiencesService } from '../../services/experiences.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from '../../../../../node_modules/rxjs';

@Component({
  selector: 'app-experience',
  templateUrl: './experience.component.html',
  styleUrls: ['../../../assets/styles/experience.component.scss']
})
export class ExperienceComponent implements OnInit {

  // Loading
  isExperienceLoaded: boolean = false;
  isExperienceEmpty: boolean = false;
  isAnyErrorPresent: boolean = false;

  // Binding
  experience: any = {};
  disease: Disease;

  // Subscriptions
  subDiseaseHolder: Subscription;
  subRoute: Subscription;
  subExperiencesService: Subscription;

  constructor(
    private diseaseHolder: DiseaseHolderService, 
    private experiencesService: ExperiencesService, 
    private route: ActivatedRoute,
    private router: Router) { 
  }

  ngOnInit() {
    this.subDiseaseHolder = this.diseaseHolder.getDisease().subscribe(disease => {
      if (disease != null) {
        //Save for future reference
        this.disease = disease;

        this.subRoute = this.route.params.subscribe(params => {
          let codUser: number = Number(params['codUser']);

          // Convert to number
          if (!isNaN(codUser)) {
            // Get the experience
            this.subExperiencesService = this.experiencesService.getExperience(this.disease.general.CodDisease, codUser).subscribe((result: any) => {
              if (result) {
                this.experience = result;
              } else {
                this.setOnErroStatus("Not valid type");
              }

              this.setWindowStatus(true, false, false);
            }, error => {
              console.log(error);
              this.setOnErroStatus("Error retriving experience");
            });
          } else {
            this.setOnErroStatus("Not a number");
          }
        }, error => {
          this.setOnErroStatus("Error retriving param");
          console.log(error);
        });
      }
    }, error => {
      this.setOnErroStatus("Disease not found");
      console.log(error);
    });
  }

  openProfile(event: any) {
    this.router.navigate(["profile/" + this.experience.CodUser]);
    event.stopPropagation();
  }

  setWindowStatus(isExperienceLoaded, isExperienceEmpty, isAnyErrorPresent, message?) {
    this.isExperienceLoaded = isExperienceLoaded;
    this.isExperienceEmpty = isExperienceEmpty;
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
    if (this.subDiseaseHolder) this.subDiseaseHolder.unsubscribe();
    if (this.subExperiencesService) this.subExperiencesService.unsubscribe();
    if (this.subRoute) this.subRoute.unsubscribe();
  }

}
