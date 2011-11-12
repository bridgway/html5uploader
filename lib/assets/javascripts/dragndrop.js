$(document).ready(function() {
  initBrowserWarning();
  initDnD();
});

function initBrowserWarning() {
  var isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
  var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
  
  if(!isChrome && !isFirefox)
    $("#browser-warning").fadeIn(125);
}

function initDnD() {
  $('#dropzone').get(0).addEventListener("dragenter", onDragEnter, false);
  $('#dropzone').get(0).addEventListener("dragleave", onDragLeave, false);
  $('#dropzone').get(0).addEventListener("dragover", noopHandler, false);
  $('#dropzone').get(0).addEventListener("drop", onDrop, false);
  
  // init the widgets
  $("#upload-status-progressbar").progressbar();
}

function noopHandler(evt) {
  evt.stopPropagation();
  evt.preventDefault();
}

function onDragEnter(evt) {
  $('#instructions').html("Release file to upload");
}

function onDragLeave(evt) {
  $('#instructions').html('');
}

function onDrop(evt) {
  // Consume the event.
  noopHandler(evt);
  
  // Reset progress bar incase we are dropping MORE files on an existing result page
  $("#upload-status-progressbar").progressbar({value:0});
  
  // Show progressbar
  $("#upload-status-progressbar").fadeIn(0);
  
  // Get the dropped files.
  var files = evt.dataTransfer.files;
  
  // If anything is wrong with the dropped files, exit.
  if(typeof files == "undefined" || files.length == 0)
    return;
  
  // Update and show the upload box
  var label = (files.length == 1 ? " file" : " files");
  //$("#upload-count").html(files.length + label);
  //$("#upload-thumbnail-list").fadeIn(125);
  
  // Process each of the dropped files individually
  for(var i = 0, length = files.length; i < length; i++) {
    uploadFile(files[i], length);
  }
}

function uploadFile(file, totalFiles) {
  var reader = new FileReader();
  
  // Handle errors that might occur while reading the file (before upload).
  reader.onerror = function(evt) {
    var message;
    
    // REF: http://www.w3.org/TR/FileAPI/#ErrorDescriptions
    switch(evt.target.error.code) {
      case 1:
        message = file.name + " not found.";
        break;
      case 2:
        message = file.name + " has changed on disk, please re-try.";
        break;
      case 3:
        messsage = "Upload cancelled.";
        break;
      case 4:
        message = "Cannot read " + file.name + ".";
        break;
      case 5:
        message = "File too large for browser to upload.";
        break;
    }
    
    $("#upload-status-text").html(message);
  }
  
  // When the file is done loading, POST to the server.
  reader.onloadend = function(evt){
    var data = evt.target.result;
    
    // Make sure the data loaded is long enough to represent a real file.
    if(data.length > 128){
      /*
       * Per the Data URI spec, the only comma that appears is right after
       * 'base64' and before the encoded content.
       */
      var base64StartIndex = data.indexOf(',') + 1;
      
      /*
       * Make sure the index we've computed is valid, otherwise something 
       * is wrong and we need to forget this upload.
       */
      if(base64StartIndex < data.length) {
        $.ajax({
          type: 'POST',
          url: '/pictures.json',
          data: 'file_data='+data.substring(base64StartIndex), // Just send the Base64 content in POST body
          processData: false, // No need to process
          timeout: 60000, // 1 min timeout
          dataType: 'text', // Pure Base64 char data
          beforeSend: function onBeforeSend(xhr, settings) {
            // Put the important file data in headers
            xhr.setRequestHeader('x-file-name', file.name);
            xhr.setRequestHeader('x-file-size', file.size);
            xhr.setRequestHeader('x-file-type', file.type);
            
            // Update status
            $("#upload-status-text").html("Uploading and Processing " + file.name + "...");
          },
          error: function onError(XMLHttpRequest, textStatus, errorThrown) {
            // Have to increment the progress bar even if it's a failed upload.
            updateAndCheckProgress(totalFiles, "Upload <span style='color: red;'>failed</span>");
            
            if(textStatus == "timeout") {
              $("#upload-details").html("Upload was taking too long and was stopped.");
            } else {
              $("#upload-details").html("An error occurred while uploading the image.");
            }
          },
          success: function onUploadComplete(response) {
            response = $.parseJSON(response);
            
            // If the parse operation failed (for whatever reason) bail
            if(!response || typeof response == "undefined") {
              // Error, update the status with a reason as well.
              $("#upload-status-text").html("Upload <span style='color: red;'>failed</span>");
              $("#upload-details").html("The server was unable to process the upload.");
              
              return;
            }
            
            if(response.success) {
              // Update status
              $("#upload-status-text").html(response.originalFileName + " Uploaded!");
              
              updateAndCheckProgress(totalFiles);
            } else {
              // Error, update the status with a reason as well.
              $("#upload-status-text").html("Upload <span style='color: red;'>failed</span>");
              $("#upload-details").html(response.message);
              
              updateAndCheckProgress(totalFiles);
            }
          }
        });
      }
    }
  };

  // Start reading the image off disk into a Data URI format.
  reader.readAsDataURL(file);
}

/**
 * Used to update the progress bar and check if all uploads are complete. Checking
 * progress entails getting the current value from the progress bar and adding
 * an incremental "unit" of completion to it since all uploads run async and
 * complete at different times we can't just update in-order.
 * 
 * This is only ever meant to be called from an upload 'success' handler.
 */
function updateAndCheckProgress(totalFiles, altStatusText) {
  var currentProgress = $("#upload-status-progressbar").progressbar("option", "value");
  currentProgress = currentProgress + (100 / totalFiles);
  
  // Update the progress bar
  $("#upload-status-progressbar").progressbar({value: currentProgress});
  
  // Check if that was the last file and hide the animation if it was
  if(currentProgress >= 99) {
    $("#upload-status-text").html((altStatusText ? altStatusText : "All Uploads Complete!"));
    $("#upload-animation").hide();
  }
}

function generateUploadResult(label, image, altInputValue) {
  var markup = "  <li><span class='label'>" + label + "</span><input readonly type='text' value='";
  
  if(image.url)
    markup += image.url;
  else
    markup += altInputValue;
  
  markup += "' /></li><li><span class='details'>";
  
  if(image.width)
    markup += image.width + "x" + image.height;
  
  if(image.width && image.sizeInBytes)
    markup += " - ";
  
  if(image.sizeInBytes)
    markup += (image.sizeInBytes / 1000) + " KB";
  
  markup += "</span></li>";
  
  return markup;
}

