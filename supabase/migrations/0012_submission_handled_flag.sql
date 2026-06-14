-- Phase 13: דגל "טופל" ידני להגשות, למסך מעקב שליחות.
alter table submissions add column handled boolean not null default false;
