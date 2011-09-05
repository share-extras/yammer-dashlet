<script type="text/javascript">//<![CDATA[
   new Extras.dashlet.Yammer("${args.htmlid}").setMessages(${messages});
   new Alfresco.widget.DashletResizer("${args.htmlid}", "${instance.object.id}");
//]]></script>
<div class="dashlet yammer-dashlet">
   <div class="title" id="${args.htmlid}-title">${msg("header")}</div>
   <div class="yammer-dashlet-toolbar toolbar" id="${args.htmlid}-toolbar">
      <a id="${args.htmlid}-link-new-post" class="theme-color-1" title="${msg('link.yammer-new-post')}" href="">${msg('link.yammer-new-post')}</a>
   </div>
   <div class="body scrollableList" <#if args.height??>style="height: ${args.height}px;"</#if>>
     <div id="${args.htmlid}-connect" class="yammer-dashlet-connect" style="display: none;">
     	<div>${msg('message.notConnected')}</div>
     	<input type="button" id="${args.htmlid}-btn-connect" value="${msg('button.connect')}" />
 	 </div>
 	 <div id="${args.htmlid}-messages" class="yammer-dashlet-messages"></div>
 	 <div id="${args.htmlid}-utils" class="yammer-dashlet-utils"><a id="${args.htmlid}-link-disconnect" class="theme-color-1" href="#">${msg('link.disconnect')}</a></div>
   </div>
</div>