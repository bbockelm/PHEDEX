package PHEDEX::Web::API::TransferHistory;
use warnings;
use strict;

=pod

=head1 NAME

PHEDEX::Web::API::TransferHistory - history of completed transfer attempts

=head1 DESCRIPTION

Serves historical statistics about completed transfer attempts.

=head2 Options

 required inputs: none (default to be the last hour)
 optional inputs: from, to, timebin, timewidth

  from            name of the source node, could be multiple
  to              name of the destination node, could be multiple
  starttime       start time
  endtime         end time
  binwidth        width of each timebin in seconds
  (ctime)         set output of time in YYYY-MM-DD hh:mm:ss format
                  otherwise, output of time is in UNIX time format

  default values:
  endtime = now
  binwidth = 3600
  starttime = endtime - binwidth

=head3 format of time

  starttime and endtime could in one of the following format
  [1] <UNIX time>            (integer)
  [2] "YYYY-MM-DD"           (assuming 00:00:00)
  [3] "YYYY-MM-DD hh:mm:ss"

=head2 Output

  <link>
    <transfer/>
    ........
  </link>
  ......

=head3 <link> elements

  from            name of the source node
  to              name of the destinatio node

=head3 <transfer> elements

  timebin         the end point of each timebin, aligned with binwidth
  binwidth        width of each timebin (from the input)
  done_files      number of files in successful transfers
  done_bytes      number of bytes in successful transfers
  fail_files      number of files in failed transfers
  fail_bytes      number of bytes in failed transfers
  expire_files    number of files expired in this timebin, binwidth
  expire_bytes    number of bytes expired in this timebin, binwidth
  rate            sum(done_bytes)/binwidth
  quality         done_files / (done_files + fail_files)

=head3 Relation with time

  starttime <= timebin < endtime
  number of bins = (endtime - starttime)/binwidth

=cut 

use PHEDEX::Web::SQL;
use PHEDEX::Core::Util;
use Data::Dumper;

sub duration { return 60 * 60; }
sub invoke { return transferhistory(@_); }

sub transferhistory
{
    my ($core, %h) = @_;

    # convert parameter keys to upper case
    foreach ( qw / from to starttime endtime binwidth ctime / )
    {
        $h{uc $_} = delete $h{$_} if $h{$_};
    }


    my $r = PHEDEX::Web::SQL::getTransferHistory($core, %h);
    my $link;

    foreach $link (@$r)
    {
        foreach (@{$link->{TRANSFER}})
        {
            $_ -> {'QUALITY'} = &Quality ($_);
        }
    }

    return { link => $r };
}

sub Quality
{
  my $h = shift;
  my $sum = $h->{DONE_FILES} + $h->{FAIL_FILES};

  if ($sum == 0)    # no transfer at all
  {
      return undef;
  }

  return $h->{DONE_FILES} / $sum;
}

1;
