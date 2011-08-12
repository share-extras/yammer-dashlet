/**
 * Copyright (C) 2010-2011 Share Extras contributors.
 */

/**
* Extras root namespace.
* 
* @namespace Extras
*/
if (typeof Extras == "undefined" || !Extras)
{
   var Extras = {};
}

/**
* Extras dashlet namespace.
* 
* @namespace Extras.dashlet
*/
if (typeof Extras.dashlet == "undefined" || !Extras.dashlet)
{
   Extras.dashlet = {};
}

/**
 * Yammer dashboard component.
 * 
 * @class Extras.dashlet.Yammer
 * @namespace Extras.dashlet
 * @author Will Abson
 */
(function()
{
   /**
    * YUI Library aliases
    */
   var Dom = YAHOO.util.Dom,
      Event = YAHOO.util.Event;

   /**
    * Alfresco Slingshot aliases
    */
   var $html = Alfresco.util.encodeHTML,
      $combine = Alfresco.util.combinePaths;

   /**
    * Preferences
    */
   var PREFS_BASE = "org.alfresco.share.oauth.",
       PREF_DATA = "data",
       PREF_TOKEN = PREF_DATA + ".token",
       PREF_SECRET = PREF_DATA + ".secret";

   /**
    * Dashboard Yammer constructor.
    * 
    * @param {String} htmlId The HTML id of the parent element
    * @return {Extras.dashlet.Yammer} The new component instance
    * @constructor
    */
   Extras.dashlet.Yammer = function Yammer_constructor(htmlId)
   {
      return Extras.dashlet.Yammer.superclass.constructor.call(this, "Extras.dashlet.Yammer", htmlId);
   };

   /**
    * Extend from Alfresco.component.Base and add class implementation
    */
   YAHOO.extend(Extras.dashlet.Yammer, Alfresco.component.Base,
   {
      /**
       * Object container for initialization options
       *
       * @property options
       * @type object
       */
      options:
      {
      },

      /**
       * OAuth helper for connecting to the Yammer service
       * 
       * @property oAuth
       * @type Extras.OAuthHelper
       * @default null
       */
      oAuth: null,

      /**
       * Fired by YUI when parent element is available for scripting
       * 
       * @method onReady
       */
      onReady: function Yammer_onReady()
      {
          // Cache DOM elements
          this.widgets.title = Dom.get(this.id + "-title");
          this.widgets.messages = Dom.get(this.id + "-messages");
          this.widgets.connect = Dom.get(this.id + "-connect");
          
          // Set up the clear credentials button
          Event.addListener(this.id + "-link-clear", "click", this.onClearCredentialsClick, this, true);
          
          // Set up the Connect button
          this.widgets.connectButton = new YAHOO.widget.Button(
             this.id + "-btn-connect",
             {
                disabled: true,
                onclick: {
                   fn: this.onConnectButtonClick,
                   obj: this.widgets.connectButton,
                   scope: this
                }
             }
          );
          
          this.oAuth = new Extras.OAuthHelper().setOptions({
              providerId: "yammer",
              endpointId: "yammer"
          });
          
          this.oAuth.init({
              successHandler: { 
                  fn: function Yammer_onReady_oAuthInit()
                  {
                      if (!this.oAuth.isConnected())
                      {
                          // Display the Connect information and button
                          Dom.setStyle(this.widgets.connect, "display", "block");
                          // Enable the button
                          this.widgets.connectButton.set("disabled", false);
                      }
                      else
                      {
                          // Run the success handler directly to load the messages
                          this.onAuthSuccess();
                      }
                  }, 
                  scope: this
              },
              failureHandler: { 
                  fn: function Yammer_onReady_oAuthInit() {
                      // Failed to init the oauth helper
                  }, 
                  scope: this
              }
          });

          
      },
      
      /**
       * Callback method used to prompt the user for a verification code to confirm that the
       * application has been granted access
       * 
       * @method onVerify
       * @param {object} obj Object literal containing properties
       *    authToken {string} the value of the temporary token granted
       *    onComplete {function} the callback function to be called to pass back the value provided by the user
       */
      onVerify: function Yammer_onVerify(obj)
      {
          var authToken = obj.authToken,
              callbackFn = obj.onComplete,
              approvalUrl = "https://www.yammer.com/oauth/authorize?oauth_token=" + authToken;
          
          // Open a new window with the oauth confirmation page
          window.open(approvalUrl);
          
          Alfresco.util.PopupManager.getUserInput({
              title: this.msg("label.verification"),
              text: this.msg("label.verificationPrompt"),
              callback: 
              {
                  fn: function Yammer_onVerify_verifierCB(value, obj) {
                      if (value != null && value != "")
                      {
                          callbackFn(value);
                      }
                  },
                  scope: this
              }
          });
      },
      
      /**
       * Callback method to use to set up the dashlet when it is known that the authentication
       * has completed successfully
       * 
       * @method onAuthSuccess
       */
      onAuthSuccess: function Yammer_onAuthSuccess()
      {
          // TODO Wire this up with Bubbling, so multiple Yammer dashlets will work

          // Remove the Connect information and button, if they are shown
          Dom.setStyle(this.widgets.connect, "display", "none");
          
          this.loadMessages();
      },
      
      /**
       * Callback method when a problem occurs with the authentication
       * 
       * @method onAuthFailure
       */
      onAuthFailure: function Yammer_onAuthFailure()
      {
          Alfresco.util.PopupManager.displayMessage({
              text: this.msg("error.general")
          });
      },
      
      /**
       * Load messages from Yammer to display on the dashboard
       * 
       * @method loadMessages
       */
      loadMessages: function Yammer_loadMessages()
      {
          // Get the latest messages from the server
          this.oAuth.request({
              url: "/api/v1/messages.json",
              success: function(o) {
                  if (o.responseText == "")
                  {
                      // Seems an empty response means the credentials have expired, unfortunately no error is returned by Yammer
                      this.oAuth.clearCredentials();
                      this.oAuth.saveCredentials();
                  }
                  else
                  {
                      var contentType = o.getResponseHeader["Content-Type"] ||
                          o.getResponseHeader["content-type"];
                      // User provided a custom successHandler
                      var json = null;
                      if (/^\s*application\/json/.test(contentType))
                      {
                          json = Alfresco.util.parseJSON(o.responseText);
                          this.renderTitle(json);
                          this.renderMessages(json);
                      }
                  }
              },
              failure: function() {
                  alert("fail");
              },
              scope: this
          });
      },
      
      /**
       * Render dashlet title
       * 
       * @method renderTitle
       */
      renderTitle: function Yammer_renderTitle(json)
      {
          if (json.meta && json.meta.feed_name)
          {
              var title = json.meta.feed_name,
                  desc = json.meta.feed_desc;
              this.widgets.title.innerHTML = this.msg("header.named", "<span title=\"" + desc + "\">" + title + "</span>");
          }
      },
      
      /**
       * Render Yammer messages
       * 
       * @method renderMessages
       */
      renderMessages: function Yammer_renderMessages(json)
      {
          var message, createdAt, url, postedLink, u, profileUri, mugshotUri, uname, userRefs = {}, ref, html = "";
          if (json.messages)
          {
              for (var i = 0; i < json.references.length; i++)
              {
                  ref = json.references[i];
                  if (ref.type == "user")
                  {
                      userRefs[ref.id] = ref;
                  }
              }
              for (var i = 0; i < json.messages.length; i++)
              {
                  message = json.messages[i];
                  postedOn = message.created_at;
                  url = message.web_url;
                  u = userRefs[message.sender_id]
                  profileUri = u ? u.web_url : null;
                  mugshotUri = u ? u.mugshot_url : null;
                  uname = u ? u.full_name : null;
                  userLink = "<a href=\"" + profileUri + "\" title=\"" + $html(uname) + "\" class=\"theme-color-1\">" + $html(uname) + "</a>";
                  postedLink = "<a href=\"" + url + "\"><span class=\"yammer-message-date\" title=\"" + postedOn + "\">" + this._relativeTime(new Date(postedOn)) + "</span><\/a>";
                  html += "<div class=\"yammer-message detail-list-item\">" + "<div class=\"yammer-message-hd\">" + 
                  "<div class=\"user-icon\"><a href=\"" + profileUri + "\" title=\"" + $html(uname) + "\"><img src=\"" + $html(mugshotUri) + "\" alt=\"" + $html(uname) + "\" width=\"48\" height=\"48\" /></a></div>" + 
                  "</div><div class=\"yammer-message-bd\">" + "<span class=\"screen-name\">" + userLink + "</span> " +
                  message.body.plain + "</div>" + "<div class=\"yammer-message-postedOn\">" +  // or message.body.parsed?
                  postedLink + "</div>" + "</div>";
              }
          }
          this.widgets.messages.innerHTML = html;
      },
      
      /**
       * Get relative time where possible, otherwise just return a simple string representation of the suppplied date
       * 
       * @method _relativeTime
       * @private
       * @param d {date} Date object
       */
      _relativeTime: function TwitterUserTimeline__getRelativeTime(d)
      {
          return typeof(Alfresco.util.relativeTime) === "function" ? Alfresco.util.relativeTime(d) : Alfresco.util.formatDate(d)
      },
      

      /**
       * YUI WIDGET EVENT HANDLERS
       * Handlers for standard events fired from YUI widgets, e.g. "click"
       */


      /**
       * Click handler for Connect button
       *
       * @method onConnectButtonClick
       * @param e {object} HTML event
       */
      onConnectButtonClick: function Yammer_onConnectButtonClick(e, obj)
      {
         // Disable the button while we make the request
         this.widgets.connectButton.set("disabled", true);

         // Callback object
         var cbObj = {
             successHandler: { 
                 fn: this.onAuthSuccess, 
                 scope: this
             },
             failureHandler: { 
                 fn: this.onAuthFailure, 
                 scope: this
             },
             verifyHandler:  { 
                 fn: this.onVerify, 
                 scope: this
             }
         }

         if (!this.oAuth.isConnected())
         {
             this.oAuth.authenticate(cbObj);
         }
         else
         {
             this.onAuthSuccess();
         }
      },
      
      /**
       * Click handler for Clear Credentials link
       *
       * @method onClearCredentialsClick
       * @param e {object} HTML event
       */
      onClearCredentialsClick: function Yammer_onClearCredentialsClick(e, obj)
      {
         // Prevent default action
         Event.stopEvent(e);
          
         // Disable the button while we make the request
         this.widgets.connectButton.set("disabled", true);
         
         this.oAuth.clearCredentials();
         this.oAuth.saveCredentials();
      }
      
   });
   
})();
