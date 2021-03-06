import { Component, OnInit } from '@angular/core';
import { DiseaseHolderService } from '../../services/disease-holder.service';
import { UserService } from '../../services/user.service';
import { ActivatedRoute } from '@angular/router';
import { Disease } from '../../models/disease';
import { ForumThreadDetails } from '../../models/forum-thread-details';
import { ForumService } from '../../services/forum.service';
import { Subscription } from '../../../../../node_modules/rxjs';

@Component({
  selector: 'app-forum-thread',
  templateUrl: './forum-thread.component.html',
  styleUrls: ['../../../assets/styles/forum-thread.component.scss']
})
export class ForumThreadComponent implements OnInit {

  constructor(
    private forumService: ForumService,
    private diseaseHolder: DiseaseHolderService,
    private userService: UserService,
    private route: ActivatedRoute) {
  }

  // Loading
  isThreadLoaded = false;
  isAnyErrorPresent = false;
  isUserLoggedIn = false;
  isReplyEmpty = false;
  isReplyPosting = false;
  isReplyPostingError = false;
  isModerator = false;
  isModeratorOfThis = false;

  // Binding
  disease: Disease;
  userID: number;
  threadID: number;
  thread: ForumThreadDetails;
  replyContent: string;

  // Subscriptions
  subDiseaseHolder: Subscription;
  subRoute: Subscription;
  subForumService: Subscription;
  subUserService: Subscription;


  ngOnInit() {
    // Try to get disease, when ready
    this.subDiseaseHolder = this.diseaseHolder.getDisease().subscribe(disease => {
      if (disease != null) {
        // Save for future reference
        this.disease = disease;

        // Check for user login
        this.subUserService = this.userService.getLoggedInStatus("Forum").subscribe((user: any) => {
          if (user.loggedIn) {
            this.isUserLoggedIn = true;
            this.userID = user.loggedIn;

            // Check if he's an admin of this disease
            if (user.codDisease) {
              this.isModerator = true;
              this.isModeratorOfThis = user.codDisease == this.disease.general.CodDisease;
            }

            // Reset variables
            this.isThreadLoaded = false;
            this.isAnyErrorPresent = false;

            // Try to get the param
            this.subRoute = this.route.params.subscribe(params => {
              let codThread: number = Number(params['codThread']);

              // Convert to number
              if (!isNaN(codThread)) {
                // Save it
                this.threadID = codThread;

                // Try to get details for the thread
                this.subForumService = this.forumService.getThread(this.disease.general.CodDisease, codThread).subscribe((result: ForumThreadDetails) => {
                  if (result) {
                    this.thread = result;
                  } else {
                    this.setOnErroStatus("Invalid format");
                  }

                  this.isThreadLoaded = true;
                }, error => {
                  // Error during retriving
                  this.setOnErroStatus("Error during retriving details");
                  console.log(error);
                });

              }

              // That was not a number!
              else {
                this.setOnErroStatus("Not a number");
              }
            }, error => {
              // Cannot retrive param
              this.setOnErroStatus("Error retriving param");
              console.log(error);
            });

          }

          // User is not logged in
          else {
            this.isUserLoggedIn = false;
            this.isThreadLoaded = true;
          }
        }, error => {
          // Cannot find if user is logged or not
          this.isAnyErrorPresent = true;
          this.isThreadLoaded = true;
          console.log(error);
        });
      }
    }, error => {
      // Error when getting disease
      this.isAnyErrorPresent = true;
      this.isThreadLoaded = true;
      console.log(error);
    });
  }

  setWindowStatus(loaded, empty, error, message?) {
    this.isThreadLoaded = loaded;
    this.isAnyErrorPresent = error;

    if (message) console.log(message);
  }

  setOnErroStatus(message) {
    this.setWindowStatus(true, false, true, message);
  }

  onReplyClick() {
    this.isReplyEmpty = false;

    if (this.replyContent) {
      if (this.replyContent != "") {
        // Ok ready to send reply
        this.isReplyPosting = true;

        // Try to send reply
        this.forumService.postReplyToThread(this.userID, this.disease.general.CodDisease, this.threadID, this.replyContent).subscribe(result => {
          if (result) {
            window.location.reload();
          } else {
            this.isReplyPostingError = true;
            console.log("Post wasn't published");
          }

          this.isReplyPosting = false;
        }, error => {
          this.isReplyPosting = false;
          this.isReplyPostingError = true;
          console.log("Post wasn't published");
          console.log(error)
        });
      } else {
        this.isReplyEmpty = true;
      }
    } else {
      this.isReplyEmpty = true;
    }
  }

  ngOnDestroy() {
    // Reset all subscriptions
    this.unsubscribeAll();
  }

  private unsubscribeAll() {
    if (this.subDiseaseHolder) this.subDiseaseHolder.unsubscribe();
    if (this.subForumService) this.subForumService.unsubscribe();
    if (this.subRoute) this.subRoute.unsubscribe();
    if (this.subUserService) this.subUserService.unsubscribe();
  }


}
