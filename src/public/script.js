var add_after = null;
var num = 0;

/* change the value of a dropdown */
var setDropDownValue = function(dropdown, value) {
  dropdown.value = value;
  var stext = $(dropdown).siblings('.text')[0];
  var sactive = $($(dropdown).siblings('.menu')).find(`.item[data-value=${value}]`);
  $(sactive).addClass('active').addClass('selected').siblings().removeClass('active').removeClass('selected');
  var label = $(sactive).text();
  $(stext).text(label);
};

/* enable elaments in a new action */
var enableElements = function () {

  $('.preview.button').unbind('click');
  $('.preview.button').click(function() {
    value = this.closest('.action.item');
    action = saveAction(value);
    $.post(`/preview`, {preview_action:JSON.stringify(action)}, function(data) {
    });  
  });

  $('.toggle.button').unbind('click');
  $('.toggle.button').click(function(){
    $(this).toggleClass('basic');
  });

  $('.button.selector').unbind('click');
  $('.button.selector').click(function(){
    $(this).siblings(':input[type=hidden]')[0].value = $(this).attr('data-value')
    $(this).toggleClass('active')
      .siblings().toggleClass('active'); 
  });

  $('.radio.button').unbind('click');
  $('.radio.button').click(function(){
    $(this).removeClass('basic')
      .siblings().addClass('basic');
  });

  /* enable dropdowns */
  $('.ui.inline.dropdown').dropdown();

  /* bind down button */
  $('.ui.button.down').unbind('click');
  $('.ui.button.down').click(function(event){
    console.log('down');
    var move_action = this.closest('.action.item');
    var next_action = $(move_action).next('.action.item');
    if(next_action.length !== 0) {
      var moved = $(move_action).detach();
      $(next_action).after(moved);
    }
  });

  /* bind up button */
  $('.ui.button.up').unbind('click');
  $('.ui.button.up').click(function(event){
    console.log('up');
    var move_action = this.closest('.action.item');
    var next_action = $(move_action).prev('.action.item');
    if(next_action.length !== 0) {
      var moved = $(move_action).detach();
      $(next_action).before(moved);
      event.stopPropagation();
    }
  });

  /* bind add button */
  $('.ui.button.add').unbind('click');
  $('.ui.button.add').click(function(){
    add_after = this.closest('.action.item');
    $('.ui.basic.modal').modal('show');
  });

  /* bind remove button */
  $('.ui.button.remove').unbind('click');
  $('.ui.button.remove').click(function(){
    this.closest('.action.item').remove();
    if($('#light_actions').children().length == 0)
      $('.ui.basic.modal').modal('show');
  });

};

/* add a new action
  TODO: location
*/
var newAction = function(action_type, action = null) {
  $('.ui.basic.modal').modal('hide');
  console.log(`Added new ${action_type}`);

  num += 1;
  var name = `light_action_${num}`
  var tag = `#light_action_${num}`

  var action_item = null;

  if(add_after === null)  
    action_item = $('#light_actions').prepend(`<div id="${name}" +  class="${action_type} action item"></div>`);
  else
    action_item = $(add_after).after(`<div id="${name}" +  class="${action_type} action item"></div>`);

  $.get(`/actions/${action_type}.html`, function(data) {
    $(tag).append(data);

    /* rename radio buttons */
    $.each($(tag).find(':input[type=radio]'), function(i, r) {
      r.name = `${r.name}_${name}`;
    });

    /* rename color buttons */
    $.each($(tag).find(':input[name=color]'), function(i,r) {
      r.name = `${r.name}_${name}`;
    });


    enableElements();

    /* update values */
    if(action !== null) {
      $($(tag).find(`:input[name=color_${name}]`)).addClass('basic');
      $.each(action.colors, function(cindex, cvalue) {
        $($(tag).find(`.${cvalue}`)[0]).removeClass('basic')
      });

      setDropDownValue($(tag).find(':input[name=speed]')[0], action.speed);
      setDropDownValue($(tag).find(':input[name=time]')[0], action.time);

      switch(action_type) {
        case 'rainbow':
        case 'alternate':
          var reverse = $(tag).find(':input[name=reverse]')[0]
          reverse.value = action.reverse;
          $(reverse).siblings(`button[data-value=${action.reverse}]`)
            .addClass('active')
            .siblings('button')
            .removeClass('active');
          break;
        case 'solid':
        case 'cycle':
          $($(tag).find(`:input[type=radio][name=brightness_${name}][value="${action.brightness}"]`)[0]).prop('checked', true);
          break;
        case 'trace':
          $($(tag).find(`:input[type=radio][name=tail_${name}][value=${action.tail}]`)[0]).prop('checked', true);
          break;
        case 'blink':
          $($(tag).find(`:input[type=radio][name=density_${name}][value=${action.alternate}]`)[0]).prop('checked', true);
          break;
      }
    } 
  });
};

$('#new_rainbow').click(function(){
  newAction('rainbow');
});

$('#new_solid').click(function(){
  newAction('solid');
});

$('#new_trace').click(function(){
  newAction('trace');
});

$('#new_blink').click(function(){
  newAction('blink');
});

$('#new_alternate').click(function(){
  newAction('alternate');
});

$('#new_cycle').click(function(){
  newAction('cycle');
});

/*
{
start:00-23,
end:00-23,
actions:
{
  action:['rainbow'|'solid'|'trace'|'blink'|'alternate'|'cycle'],
  speed:[0-10],// fractions of a second
  time[1-10], // minutes 
  colors:['white','black',...], // one or more 
  reverse:[false|true], // start at top or bottom 
  brightness:[%],
  alternate:[1-10], // skip leds 
  tail:[1-20] // for pulse 
}
}
*/


var restore = function(actions) {
  setDropDownValue($(':input[name=start]')[0], actions.start);
  setDropDownValue($(':input[name=end]')[0], actions.end);

  if(actions.state) {
    $('.stop.button').removeClass('active');
    $('.play.button').addClass('active');
  } 
  else {
    $('.stop.button').addClass('active');
    $('.play.button').removeClass('active');
  }

  /* add in reverse order (always to the top */
  actions.actions.reverse();
  $.each(actions.actions, function(i, action) {
    newAction(action.action, action); 
  });

  enableElements();
}

$('.stop.button').click(function() {
  $('.play.button').removeClass('active');
  $.get('/stop', function(data) {
    $('.stop.button').addClass('active');
  });
});

$('.play.button').click(function() {
  $('.stop.button').removeClass('active');
  $.get('/start', function(data) {
    $('.play.button').addClass('active');
  });
});

var saveAction = function(value) {
    var action_item = $(value);
    var action_type = $(action_item).find(':input[name=action_type]')[0].value;

    var colors = [];

    $.each($(action_item).find(`:input[name=color_${value.id}]`), function(cindex, cvalue) {
      if($(cvalue).hasClass('basic') == false) colors.push(cvalue.value);
    });

    var action = {
      action:action_type,
      speed:parseInt($(action_item).find(':input[name=speed]')[0].value),
      time:parseInt($(action_item).find(':input[name=time]')[0].value),
      reverse:0,
      colors:colors
    }

    switch(action_type) {
      case 'rainbow':
      case 'alternate':
        action.reverse = parseInt($(action_item).find(':input[name=reverse]')[0].value);
        break;
      case 'solid':
      case 'cycle':
        action.brightness = parseFloat($(action_item).find(`:input[type=radio][name=brightness_${value.id}]:checked`)[0].value);
        break;
      case 'trace':
        action.tail = parseInt($(action_item).find(`:input[type=radio][name=tail_${value.id}]:checked`)[0].value);
        break;
      case 'blink':
        action.alternate = parseInt($(action_item).find(`:input[type=radio][name=density_${value.id}]:checked`)[0].value);
        break;
    }

  return action;
};

$('.save.button').click(function() {
  state = $('.play.button').hasClass('active')? 1 : 0;

  var save = {
    state:state,
    start:parseInt($(':input[name=start]')[0].value),
    end:parseInt($(':input[name=end]')[0].value),
    actions:[] 
  };


  var actions = $('#light_actions').children('.action.item');

  $.each(actions, function(index, value) {
    action = saveAction(value);
    save.actions.push(action);
  });

  $.post(`/lights`, {save:JSON.stringify(save)}, function(data) {
  });
});

$(document).ready(function(){
  fetch('/lights', { method: 'GET' }).then(data => {
    data.json().then(actions => {
      if(actions.actions.length === 0) {
        enableElements();
        if($('#light_actions').children().length == 0)
          $('.ui.basic.modal').modal('show');
      } else restore(actions);
    });
  });

  /* $.get('/lights', function(data) {
    var actions = JSON.parse(data);
    if(actions.actions.length === 0) {
      enableElements();
      if($('#light_actions').children().length == 0)
        $('.ui.basic.modal').modal('show');
    } else restore(actions);
  }); */
});

