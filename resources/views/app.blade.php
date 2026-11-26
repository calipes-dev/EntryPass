<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>EntryPass</title>
    <link rel="icon" type="image/svg+xml" sizes="any" href="{{ '/entrypass-mark.svg' }}">
    @vite('resources/js/main.jsx')
</head>
<body>
    <div id="root" data-role="{{ auth()->user()?->role }}" data-brand-mark="{{ '/entrypass-mark.svg' }}">Loading EntryPass…</div>
</body>
</html>
