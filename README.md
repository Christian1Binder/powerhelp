# PowerHelp 2.0

**Offline-Werkstatt für Windows PowerShell 5.1.** Eine einzige HTML-Datei mit 107 Bausteinen, 15 fertigen Abläufen, aufgabenorientierter Suche und Regex-Werkstatt. Ohne Installation, Webserver, externe Bibliotheken oder Online-KI.

[App öffnen](https://christian1binder.github.io/powerhelp/)

## Offline verwenden

`index.html` herunterladen und in Edge öffnen. Alternativ in der App **HTML herunterladen** wählen. Der Browser braucht danach keine Internetverbindung. Die Content Security Policy verhindert Netzwerkaufrufe der App; es werden keine Dateien an einen Dienst übertragen.

## Arbeitsablauf

1. Aufgabe, Stichwort oder Cmdlet suchen, zum Beispiel „alte Dateien löschen“, „Benutzer CSV“, „NTFS Rechte“ oder `Get-ChildItem`.
2. Einzelne Bausteine hinzufügen oder einen fertigen Ablauf laden. Die Suche nutzt Synonyme und toleriert Tippfehler.
3. Felder anpassen. Texte werden als PowerShell-Literale zitiert; **fx** wechselt zu einem sichtbaren PowerShell-Ausdruck, etwa `$Datei.FullName`.
4. Ausgabenamen festlegen und später als Eingabevariablen verwenden. Die Ablaufprüfung meldet fehlende Quellschritte.
5. Schleifen, Bedingungen, Funktionen und Fehlerbehandlung verschachteln. Schritte derselben Ebene mit ↑/↓ oder durch Ziehen ordnen.
6. Projekt als JSON sichern oder Skript mit UTF-8-BOM und Windows-Zeilenenden als `.ps1` exportieren.

Die App speichert das Projekt lokal im Browser, soweit lokale Speicherung erlaubt ist. Eine exportierte Projektdatei lässt sich später wieder öffnen. PowerHelp-Projekte enthalten die eingetragenen Werte und eigenen Code; Kennwörter werden von den bereitgestellten Kontobausteinen erst im ausgeführten Skript verdeckt abgefragt.

## Abgedeckte Bereiche

- Dateien, Ordner, Hashes, Archive, Robocopy und Zeilenextraktion.
- Text, Regex, Ersetzen, CSV, JSON, Filter, Sortierung und Berichte.
- Lokale Benutzer, Gruppen und Kennwortänderungen.
- NTFS-Rechte und SMB-Freigaben.
- Dienste, Prozesse, Netzwerk, DNS, TCP-Ports und Firewall.
- Systeminformationen, Ereignisprotokolle, Datenträger und Registry.
- Aufgabenplanung und internes PowerShell-Remoting.
- Active Directory, wenn das Modul bereits installiert ist.
- Variablen, verschachtelte Schleifen/Bedingungen, Funktionen, try/catch und eigener PowerShell-Code.

Die Bibliothek enthält verbreitete Administratoraufgaben. Sie ist kein vollständiger Katalog aller Windows-Rollen oder Cmdlet-Parameter. Eigene Codeblöcke ermöglichen die Erweiterung eines Ablaufs mit beliebigem PowerShell-Code.

## Regex-Werkstatt

Beispieltext eingeben oder eine lokale Textdatei laden, Muster und Treffergruppe auswählen, Werte als CSV exportieren oder das Muster in den Skriptablauf übernehmen. Die Vorschau arbeitet in einem Worker mit Zeitlimit, sodass aufwendige Muster abgebrochen werden können. Maximal 1000 Treffer und 100.000 Textzeichen in der Vorschau.

**Engine-Unterschied:** Die Vorschau verwendet JavaScript-RegExp. Führende .NET-Flags `(?i)`, `(?m)`, `(?s)` werden für die Vorschau umgesetzt. Das erzeugte PowerShell-Skript verwendet die .NET-Regex-Engine. Erweiterte .NET-Muster können daher im Skript gültig sein, obwohl der Browser sie nicht unterstützt, oder abweichende Ergebnisse liefern.

## Vorschau-Modus

Bekannte Änderungsbausteine werden mit `$PSCmdlet.ShouldProcess` geschützt. Der standardmäßig aktivierte Vorschau-Modus setzt `$WhatIfPreference = $true`. Exportierte Skripte akzeptieren zusätzlich `-WhatIf`. Lesebefehle werden trotzdem ausgeführt. Bei eigenem Code und Remoting bestimmt das Feld **Wirkung**, ob der Code geschützt wird. Ein optionales Transkript wird auch im Vorschau-Modus geschrieben.

## Kompatibilität und Grenzen

Ziel: Windows PowerShell 5.1 auf Windows 10/11 und Windows Server ab 2016. AD-, SMB-, Netzwerk-, Storage- und Aufgabenplanungsbefehle benötigen die passenden bereits vorhandenen Windows-Module und Berechtigungen. PowerHelp installiert keine Module. LocalAccounts steht auf Domänencontrollern und in 32-Bit-PowerShell auf einem 64-Bit-System nicht zur Verfügung.

Die App führt keine Skripte aus und enthält keinen echten PowerShell-Parser. Die Prüfung erfasst Pflichtfelder, ausgewählte Werte, bekannte Variablenabhängigkeiten und einige typische Fehler. Eigene Ausdrücke, vorhandene Pfade, Berechtigungen, Serverrollen und Dateninhalte bleiben abhängig von der Ausführungsumgebung. Vorschau-Variablen aus übersprungenen Änderungsbefehlen können ohne Ergebnis bleiben.

## Entwicklung und Tests

Quelltexte liegen in `src/`. `python3 build.py` erzeugt daraus die einzelne `index.html`; Python benötigt keine Zusatzpakete. Zum Nutzen der App ist Python nicht erforderlich.

```sh
node tests/test-core.js
node tests/generate-cases.js cases.json
```

Die GitHub-Actions-Prüfung führt den Generatortest aus und prüft 122 erzeugte Skripte mit dem Parser von Windows PowerShell 5.1. Sie kontrolliert außerdem Parameter der auf dem Prüfrechner verfügbaren Cmdlets. Dabei werden keine generierten Administratorbefehle ausgeführt.
