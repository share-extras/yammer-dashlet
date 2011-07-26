<script type="text/javascript">//<![CDATA[
   new Extras.dashlet.Yammer("${args.htmlid}").setOptions(
   {
      "consumerKey": "${config.script.yammer.consumerKey}",
      "consumerSecret": "${config.script.yammer.consumerSecret}"
   }).setMessages(${messages});
   new Alfresco.widget.DashletResizer("${args.htmlid}", "${instance.object.id}");
//]]></script>
<div class="dashlet yammer-dashlet">
   <div class="title" id="${args.htmlid}-title">${msg("header")}</div>
   <div class="body scrollableList">
     <div id="${args.htmlid}-connect" class="yammer-dashlet-connect" style="display: none;">
     	<div>${msg('message.notConnected')}</div>
     	<input type="button" id="${args.htmlid}-btn-connect" value="${msg('button.connect')}" />
 	 </div>
 	 <div id="${args.htmlid}-messages" class="yammer-dashlet-messages"></div>
 	 <div id="${args.htmlid}-utils" class="yammer-dashlet-utils"><a id="${args.htmlid}-link-clear" href="#">Clear credentials</a></div>
   </div>
</div>