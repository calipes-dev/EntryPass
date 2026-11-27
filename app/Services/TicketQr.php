<?php

namespace App\Services;

use BaconQrCode\Common\ErrorCorrectionLevel;
use BaconQrCode\Encoder\Encoder;

final class TicketQr
{
    public static function png(string $ticketCode): string
    {
        $matrix = Encoder::encode($ticketCode, ErrorCorrectionLevel::M())->getMatrix();
        $scale = 8;
        $margin = 4;
        $size = ($matrix->getWidth() + 2 * $margin) * $scale;
        $white = str_repeat("\xff", $margin * $scale);
        $blank = str_repeat("\0".str_repeat("\xff", $size), $margin * $scale);
        $pixels = $blank;

        for ($y = 0; $y < $matrix->getHeight(); $y++) {
            $row = "\0".$white;
            for ($x = 0; $x < $matrix->getWidth(); $x++) {
                $row .= str_repeat($matrix->get($x, $y) === 1 ? "\0" : "\xff", $scale);
            }
            $pixels .= str_repeat($row.$white, $scale);
        }

        return "\x89PNG\r\n\x1a\n"
            .self::chunk('IHDR', pack('NNC5', $size, $size, 8, 0, 0, 0, 0))
            .self::chunk('IDAT', gzcompress($pixels.$blank))
            .self::chunk('IEND', '');
    }

    private static function chunk(string $type, string $data): string
    {
        return pack('N', strlen($data)).$type.$data.pack('N', crc32($type.$data));
    }
}
