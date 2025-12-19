-- Your SQL goes here

update readings
set question = (regexp_match(question, '(^.+?\?+)'))[1],
    context  = trim(regexp_replace(question, '(^.+?\?+)', ''))
where context = ''
  and (regexp_match(question, '(^.+?\?+)'))[1] is not null;
