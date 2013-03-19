'use strict';

var _      =  require('underscore')
  , anchor =  require('anchor-markdown-header');

function notNull(x) { return  x !== null; }

var anchor_id = 0;

function addAnchor(header) {
    // header.anchor = anchor(header.name);
    header.anchor = "id-" + anchor_id;
    anchor_id = anchor_id + 1;
    return header;
}


function getHashedHeaders (_lines) {
  var inCodeBlock = false;
  
  // Turn all headers into '## xxx' even if they were '## xxx ##'
    // and remove inpage link
  function normalize(header) {
    return header.replace(/[ #]+$/, '').replace(/<a.*\/a>/, '');
  }

  // Find headers of the form '### xxxx xxx xx [###]'
  return _lines
    .filter(function (x) {
      if (x.match(/^```/)) {
        inCodeBlock = !inCodeBlock;
      }
      return !inCodeBlock;
    })
    .map(function (x, index) {
      var match = /^(\#{1,8})[ ]*(.+)$/.exec(x);
      
      return match 
        ? { rank :  match[1].length
          , name :  normalize(match[2])
          , line :  index
          } 
        : null;
    })
    .filter(notNull)
    .value();
}

function getUnderlinedHeaders (_lines) {
    // Find headers of the form
    // h1       h2
    // ==       --
    
    return _lines
      .map(function (line, index, lines) {
        if (index === 0) return null;
        var rank;
            
        if (/^==+/.exec(line))      rank = 1;
        else if (/^--+/.exec(line)) rank = 2;
        else                        return null;

        return {
          rank  :  rank,
          name  :  lines[index - 1],
          line  :  index - 1
        };
      })
      .filter(notNull)
      .value();
}

module.exports = function transform(content) {
    var raw_lines       =  content.split('\n')
    , _raw_lines        =  _(raw_lines).chain();
    var inCodeBlock = false;
    var anchor_index = 0;
    var filtered_content = _raw_lines
        .map(function (x, index) {
            var match = /^(\#{1,8})[ ]*(.+)$/.exec(x);
            if (match) {
                var ret = x + '<a name="id-' + anchor_index + '" id="id-' + anchor_index + '"></a>';
                anchor_index = anchor_index + 1;
                return ret;
            }
            else
                return x;
        })
        .value().join("\n");
    console.log(filtered_content);
    var lines       =  filtered_content.split('\n')
    , _lines        =  _(lines).chain();
  var allHeaders    =  getHashedHeaders(_lines).concat(getUnderlinedHeaders(_lines))
    , lowestRank    =  _(allHeaders).chain().pluck('rank').min().value()
    , linkedHeaders =  _(allHeaders).map(addAnchor);

  if (linkedHeaders.length === 0) return { transformed: false };

  var toc = 
        // '**Table of Contents**  *generated with [DocToc](http://doctoc.herokuapp.com/)*'   +
        '\n\n'                                      
        + linkedHeaders
        .map(function (x) {
          var indent = _(_.range(x.rank - lowestRank))
            .reduce(function (acc, x) { return acc + '\t'; }, '');

          return indent + '- ' + "[" + x.name + "]" + "(#" + x.anchor + ")";
        })
        .join('\n')                                     
    + '\n';

  var currentToc = _lines
    .first(linkedHeaders[0].line)
    .value()
    .join('\n');
    
  if (currentToc === toc) return { transformed: false };

  // Skip all lines up to first header since that is the old table of content
  var remainingContent = _lines
    .rest(linkedHeaders[0].line)
    .value()
    .join('\n');

  var data = toc + '\n' + remainingContent;

  return { transformed : true, data : data };
};
