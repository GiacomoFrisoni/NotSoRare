import { Component, OnInit } from '@angular/core';
import { ForumService } from '../../services/forum.service';
import { DiseaseHolderService } from '../../services/disease-holder.service';
import { Disease } from '../../models/disease';
import { ForumThread } from '../../models/forum-thread';
import { UserService } from '../../services/user.service';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from '../../../../../node_modules/rxjs';

@Component({
  selector: 'app-forum',
  templateUrl: './forum.component.html',
  styleUrls: ['../../../assets/styles/forum.component.scss']
})
export class ForumComponent implements OnInit {

  // Loading
  isThreadsLoaded = false;
  isAnyErrorPresent = false;
  isThreadsEmpty = false;
  isUserLoggedIn = false;
  isModerator = false;

  // Binding
  disease: Disease;
  threads: ForumThread[];

  // Subscriptions
  subDiseaseHolder: Subscription;
  subForumService: Subscription;
  subUserService: Subscription;


  constructor(
    private forumService: ForumService,
    private diseaseHolder: DiseaseHolderService,
    private userService: UserService,
    private router: Router,
    private activatedRoute: ActivatedRoute) {
  }

  ngOnInit() {
    this.subDiseaseHolder = this.diseaseHolder.getDisease().subscribe(disease => {
      if (disease != null) {
        // Save for future reference
        this.disease = disease;

        // Check for user login
        this.subUserService = this.userService.getLoggedInStatus("Forum").subscribe((user: any) => {
          if (!user.codDisease) {
            if (user.loggedIn) {
              this.isUserLoggedIn = true;


              // Reset variables
              this.isThreadsLoaded = false;
              this.isAnyErrorPresent = false;
              this.isThreadsEmpty = false;

              // Try to get all threads
              this.subForumService = this.forumService.getAllThreads(this.disease.general.CodDisease).subscribe((results: ForumThread[]) => {
                if (results) {
                  if (results.length > 0) {
                    this.threads = results;
                  }
                  else {
                    this.isThreadsEmpty = true;
                  }
                } else {
                  this.isAnyErrorPresent = true;
                }

                this.isThreadsLoaded = true;
              }, error => {
                this.isThreadsLoaded = true;
                this.isAnyErrorPresent = true;
                console.log(error);
              });
            } else {
              this.isUserLoggedIn = false;
              this.isThreadsLoaded = true;
            }
          } else {
            //Admin cannot
            this.isUserLoggedIn = false;
            this.isThreadsLoaded = true;
            this.isModerator = true;
          }
        }, error => {
          this.isAnyErrorPresent = true;
          this.isThreadsLoaded = true;
        })



      }
    }, error => {
      // Error when getting disease
      this.isAnyErrorPresent = true;
      this.isThreadsLoaded = true;
      console.log(error);
    });
  }


  onThreadClick(threadCode: number) {
    this.router.navigate(['./' + threadCode], { relativeTo: this.activatedRoute });
  }

  ngOnDestroy() {
    // Reset all subscriptions
    this.unsubscribeAll();
  }

  private unsubscribeAll() {
    if (this.subDiseaseHolder) this.subDiseaseHolder.unsubscribe();
    if (this.subForumService) this.subForumService.unsubscribe();
    if (this.subUserService) this.subUserService.unsubscribe();
  }


}
