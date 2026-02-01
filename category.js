function categoryPost(config) {
    // Default configuration
    var defaults = {
        home: "/",
        title: "Posts",
        pstNm: 6,           // Number of posts to fetch
        thmbSize: 600,      // Thumbnail size
        snptLnth: 150,      // Snippet length (characters)
        time: "published",  // Use "published" or "updated" time
        pgn: true,          // Enable pagination
        ldCl: "loaded"      // CSS class added when loaded
    };
    
    // Merge configuration
    for (var key in config) {
        defaults[key] = config[key] !== undefined ? config[key] : defaults[key];
    }
    
    var options = defaults;
    
    // Build feed URL
    var baseUrl = options.home
        .replace(/\/$/, "")           // Remove trailing slash
        .replace(/.*?:\/\//g, "//")    // Normalize protocol to //
        + "/";
    
    var labelPath = (options.label && options.label.length > 0) ? 
        "-/" + options.label : "";
    
    var feedUrl = baseUrl + "feeds/posts/default" + 
        encodeURI(labelPath) + 
        "?alt=json&orderby=" + 
        (options.time === "updated" ? "updated" : "published") + 
        "&max-results=" + options.pstNm;
    
    // Make AJAX request
    var xhr = new XMLHttpRequest();
    try {
        xhr = new XMLHttpRequest();
    } catch (e) {
        try {
            xhr = new ActiveXObject("Msxml2.XMLHTTP");
        } catch (e) {
            try {
                xhr = new ActiveXObject("Microsoft.XMLHTTP");
            } catch (e) {
                console.log("Something went wrong!");
                return;
            }
        }
    }
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                var data = JSON.parse(xhr.responseText);
                renderPosts(data);
            } else if (typeof options.error === "function") {
                options.error(xhr);
            }
        }
    };
    
    xhr.open("GET", feedUrl, true);
    xhr.send();
    
    // Helper function to format dates
    function formatDate(dateStr) {
        var date = dateStr.substring(0, 10);
        var year = date.substring(0, 4);
        var month = date.substring(5, 7);
        var day = date.substring(8, 10);
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return months[parseInt(month) - 1] + " " + day + ", " + year;
    }
    
    // Render posts
    function renderPosts(data) {
        var container = document.getElementById(options.id);
        if (!container) {
            console.log("Sorry, Container with id '" + options.id + "' was not found!");
            return;
        }
        
        var feed = data.feed;
        if (!feed || !feed.entry || feed.entry.length === 0) {
            if (options.label) {
                container.innerHTML = "<div class='note'>No Post was found with label '" + 
                    options.label + "'.</div>";
            } else {
                container.innerHTML = "<div class='note'>No Post was found.</div>";
            }
            return;
        }
        
        var html = "";
        
        // Add title if specified
        if (options.title) {
            html += '<h2 class="title">' + options.title + '</h2>';
        }
        
        html += '<div class="blogPts ctgryPts">';
        
        // Process entries
        for (var i = 0; i < feed.entry.length; i++) {
            var entry = feed.entry[i];
            var postUrl = "";
            var isProduct = false;
            var isSponsored = false;
            
            // Find post URL (alternate link)
            for (var j = 0; j < entry.link.length; j++) {
                if (entry.link[j].rel === "alternate") {
                    postUrl = entry.link[j].href;
                }
            }
            
            // Check for Product and Sponsored categories
            if (entry.category) {
                for (var k = 0; k < entry.category.length; k++) {
                    if (entry.category[k].term === "Product") isProduct = true;
                    if (entry.category[k].term === "Sponsored") isSponsored = true;
                }
            }
            
            // Get thumbnail
            var thumbnail = "";
            if (entry.media$thumbnail) {
                thumbnail = entry.media$thumbnail.url;
            }
            
            // If no thumbnail but has content, try to extract first image
            if (!thumbnail && entry.content) {
                var imgMatch = /<img +(.*?)src=(['"])([^'"]+?)(['"])(.*?) *\/?>/i.exec(entry.content.$t);
                if (imgMatch && imgMatch[3]) {
                    thumbnail = imgMatch[3];
                }
            }
            
            // Process thumbnail URL - resize and clean
            if (thumbnail) {
                var sizeSuffix = thumbnail.includes("-rw") ? "" : "-rw-e30";
                thumbnail = thumbnail
                    .replace(/.*?:\/\//g, "//")
                    .replace(/\/s[0-9]+(\-c)?/, "/s" + options.thmbSize + sizeSuffix)
                    .replace(/\=s[0-9]+(\-c)?/, "=s" + options.thmbSize + sizeSuffix);
            }
            
            // Get snippet (cleaned content)
            var snippet = "";
            if (entry.content && options.snptLnth > 0) {
                snippet = entry.content.$t
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
                    .replace(/<style.*?<\/style>/g, "")
                    .replace(/<\!--.*?-->/g, "")
                    .split("<a name='more'>")[0]
                    .replace(/(<([^>]+)>)/gi, "")
                    .replace(/(\r\n|\n|\r)/gm, "")
                    .substring(0, options.snptLnth);
            }
            
            // Get comment count
            var commentCount = "0";
            for (var l = 0; l < entry.link.length; l++) {
                if (entry.link[l].rel === "replies" && entry.link[l].title) {
                    var match = entry.link[l].title.match(/(\d+)/);
                    if (match) commentCount = match[1];
                }
            }
            
            // Build categories HTML
            var categoriesHtml = "";
            if (entry.category && entry.category[0]) {
                var cat1 = entry.category[0];
                categoriesHtml = "<div class='pLbls' data-text='in'> " +
                    "<a aria-label='" + cat1.term + "' data-text='" + cat1.term + "' " +
                    "href='" + options.home + "search/label/" + encodeURI(cat1.term) + "' " +
                    "rel='tag'></a>";
                
                if (entry.category[1]) {
                    var cat2 = entry.category[1];
                    categoriesHtml += "<a aria-label='" + cat2.term + "' data-text='" + cat2.term + "' " +
                        "href='" + options.home + "search/label/" + encodeURI(cat2.term) + "' " +
                        "rel='tag'></a>";
                }
                
                if (isSponsored && !isProduct) {
                    categoriesHtml = "<div class='pLbls nSpr'><span data-text='Sponsored'></span></div>" + 
                        categoriesHtml;
                } else {
                    categoriesHtml += "</div></div>";
                }
            }
            
            // Format date
            var postDate = (options.time === "updated") ? 
                formatDate(entry.updated.$t) : 
                formatDate(entry.published.$t);
            
            // Build article
            var articleClass = "ntry";
            if (isProduct) articleClass += " pTag";
            if (!thumbnail) articleClass += " noThmb";
            
            // Thumbnail section
            var thumbHtml;
            if (thumbnail) {
                thumbHtml = "<div class='pThmb'>" +
                    "<a class='thmb' href='" + postUrl + "'>" +
                    "<img alt='" + entry.title.$t + "' class='imgThm lazy' " +
                    "data-src='" + thumbnail + "' " +
                    "src='data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='/></a>";
                
                // Badges (comments, product icon, sponsored icon)
                var badges = "";
                if (commentCount.match(/^[0-9]+$/) && commentCount !== "0" && !isProduct) {
                    badges += "<a aria-label='Comments' class='cmnt' " +
                        "data-text='" + commentCount + " Comments' href='" + postUrl + "#comment' " +
                        "role='button'><svg class='line' viewBox='0 0 24 24'>...</svg></a>";
                }
                if (isProduct) {
                    badges += "<div class='spnr'><svg class='line' viewBox='0 0 24 24'>" +
                        "<path d='M4.16989 15.3L8.69989 19.83...'/></svg></div>";
                }
                if (isSponsored && !isProduct) {
                    badges += "<div class='spnr'><svg class='line' viewBox='0 0 24 24'>" +
                        "<path d='M13 11L21.2 2.80005...'/></svg></div>";
                }
                
                thumbHtml += "<div class='iFxd'>" + badges + "</div></div>";
            } else {
                thumbHtml = "<div class='pThmb nul'><div class='thmb'>" +
                    "<span class='imgThm' data-text='No image'></span></div></div>";
            }
            
            // Content section
            var contentHtml = "<div class='pCntn'>" + categoriesHtml +
                "<h2 class='pTtl aTtl sml'>" +
                "<a data-text='" + entry.title.$t + "' href='" + postUrl + "' rel='bookmark'>" +
                entry.title.$t + "</a></h2>";
            
            if (snippet) {
                contentHtml += "<div class='pSnpt" + (isProduct ? " pTag" : "") + "'>" + 
                    snippet + "</div>";
            }
            
            contentHtml += "<div class='pInf pSml'>" +
                "<time class='aTtmp pTtmp pbl' data-text='" + postDate + "' " +
                "title='" + postDate + "'>" + 
                (options.time === "updated" ? "Updated: " : "Published: ") + 
                postDate + "</time>" +
                "<a aria-label='Read more' class='pJmp' data-text='Keep reading' " +
                "href='" + postUrl + "'></a>" +
                "</div></div>";
            
            html += "<article class='" + articleClass + "'>" + thumbHtml + contentHtml + 
                "</article>";
        }
        
        // Pagination
        if (options.pgn) {
            var nextUrl;
            if (options.label) {
                nextUrl = options.home + "search/label/" + encodeURI(options.label) + 
                    "?updated-max=" + feed.entry[feed.entry.length - 1].published.$t;
            } else {
                nextUrl = options.home + "?updated-max=" + 
                    feed.entry[feed.entry.length - 1].published.$t;
            }
            
            html += "<div class='blogPg'>" +
                "<a aria-label='View More' data-text='" + 
                (options.label ? options.label + " - View More" : "View More") + 
                "' href='" + nextUrl + "'></a></div>";
        }
        
        html += "</div>";
        
        // Update DOM
        container.innerHTML = html;
        container.classList.add(options.ldCl);
        
        // Initialize lazy loading (using Defer.js library)
        if (typeof Defer !== "undefined") {
            Defer.dom(".lazy", 100, options.ldCl, null, {rootMargin: "1px"});
        }
    }
    
    function handleError(xhr) {
        console.log("Failed to get Blog Feeds with status: " + xhr.status);
        var container = document.getElementById(options.id);
        if (container) {
            container.innerHTML = "<div class='note wr'>Failed to load Posts :(</div>";
        }
    }
}
