$ErrorActionPreference = 'Stop'
$now = [TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTime]::UtcNow, 'Eastern Standard Time')
$weekday = (([int]$now.DayOfWeek + 6) % 7) + 1
'{0} {1}' -f $weekday, $now.ToString('yyyy-MM-dd HH:mm', [Globalization.CultureInfo]::InvariantCulture)
