alter policy "Firebase admin can insert members" on public.members
with check (
  (((select auth.jwt()) ->> 'sub') = 'dJ2QLk0v7RYoaq7JauNWajLo0L52')
  and (((select auth.jwt()) ->> 'iss') = 'https://securetoken.google.com/signalplanner-95f78')
  and (((select auth.jwt()) ->> 'aud') = 'signalplanner-95f78')
);

alter policy "Firebase admin can update members" on public.members
using (
  (((select auth.jwt()) ->> 'sub') = 'dJ2QLk0v7RYoaq7JauNWajLo0L52')
  and (((select auth.jwt()) ->> 'iss') = 'https://securetoken.google.com/signalplanner-95f78')
  and (((select auth.jwt()) ->> 'aud') = 'signalplanner-95f78')
)
with check (
  (((select auth.jwt()) ->> 'sub') = 'dJ2QLk0v7RYoaq7JauNWajLo0L52')
  and (((select auth.jwt()) ->> 'iss') = 'https://securetoken.google.com/signalplanner-95f78')
  and (((select auth.jwt()) ->> 'aud') = 'signalplanner-95f78')
);

alter policy "Firebase admin can delete members" on public.members
using (
  (((select auth.jwt()) ->> 'sub') = 'dJ2QLk0v7RYoaq7JauNWajLo0L52')
  and (((select auth.jwt()) ->> 'iss') = 'https://securetoken.google.com/signalplanner-95f78')
  and (((select auth.jwt()) ->> 'aud') = 'signalplanner-95f78')
);

