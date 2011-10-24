/**
 * Copyright (C) 2010-2011 Share Extras contributors.
 */
(function()
{
   /**
    * Post a file to Yammer
    *
    * @method onActionPostToYammer
    * @param record {object} Object literal representing one file or folder to be actioned
    */
   YAHOO.Bubbling.fire("registerAction",
   {
      actionName: "onActionPostToYammer",
      fn: function Yammer_onActionPostToYammer(record)
      {
         var nodeRef = new Alfresco.util.NodeRef(record.nodeRef),
             documentName = record.displayName,
             documentUrl = window.location.href.substring(0, window.location.href.lastIndexOf("/")) + "/document-details?nodeRef=" + nodeRef.nodeRef;

         var oAuth = new Extras.OAuthHelper().setOptions({
             providerId: "yammer",
             endpointId: "yammer"
         });
         
         oAuth.init({
             successCallback: { 
                 fn: function Yammer_action_oAuthInit()
                 {
                     if (!oAuth.hasToken())
                     {
                         Alfresco.util.PopupManager.displayMessage({
                             text: Alfresco.util.message("actions.extras.yammmer.notConnected")
                         });
                     }
                     else
                     {
                         // Pop up the text prompt
                         Alfresco.util.PopupManager.getUserInput({
                             title: Alfresco.util.message("actions.extras.yammmer.title"),
                             text: Alfresco.util.message("actions.extras.yammmer.prompt"),
                             value: documentName + " - " + documentUrl,
                             callback:
                             {
                                 fn: function Yammer_onNewPostClick_postCB(value, obj) {
                                     if (value != null && value != "")
                                     {
                                         var dataObj = {
                                                 body: value
                                         };
                                         
                                         // Post the update
                                         oAuth.request({
                                             url: "/api/v1/messages.json",
                                             method: "POST",
                                             dataObj: dataObj,
                                             requestContentType: Alfresco.util.Ajax.FORM,
                                             successCallback: {
                                                 fn: function(o) {
                                                     if (o.responseText == "")
                                                     {
                                                         throw new Error("Received empty response")
                                                     }
                                                     else
                                                     {
                                                         if (typeof o.json == "object")
                                                         {
                                                             Alfresco.util.PopupManager.displayMessage({
                                                                 text: Alfresco.util.message("actions.extras.yammmer.posted")
                                                             });
                                                         }
                                                         else
                                                         {
                                                         }
                                                     }
                                                 },
                                                 scope: this
                                             },
                                             failureCallback: {
                                                 fn: function() {
                                                     Alfresco.util.PopupManager.displayMessage({
                                                         text: Alfresco.util.message("actions.extras.yammmer.postedError")
                                                     });
                                                 },
                                                 scope: this
                                             }
                                         });
                                     }
                                 },
                                 scope: this
                             }
                         });
                     }
                 }, 
                 scope: this
             },
             failureCallback: { 
                 fn: function Yammer_onReady_oAuthInit() {
                     // Failed to init the oauth helper
                     Alfresco.util.PopupManager.displayMessage({
                         text: Alfresco.util.message("actions.extras.yammmer.initError")
                     });
                 }, 
                 scope: this
             }
         });
      }
   });
})();