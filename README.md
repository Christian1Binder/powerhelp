# PowerHelp 3.1

**Offline-Werkstatt für Windows PowerShell 5.1.** Eine einzige HTML-Datei mit 108 Bausteinen, 16 fertigen Abläufen, aufgabenorientierter Suche und Regex-Werkstatt. Ohne Installation, Webserver, externe Bibliotheken oder Online-KI.

[App öffnen](https://christian1binder.github.io/powerhelp/)

## Kurze, verständliche Skripte

**Kurz & verständlich** ist die Standardausgabe. Sie enthält die gewählten Befehle ohne allgemeines Skriptgerüst, zusätzliche ErrorAction-Parameter oder Kommentare pro Schritt. Die Ausgabe **Mit Skriptgerüst & Absicherung** bleibt auswählbar. Kommentare, Protokoll und Skriptparameter lassen sich unabhängig aktivieren.

Der Ablauf **Text aus einer Datei als CSV** erzeugt im Echtbetrieb vier Zeilen:

```powershell
$Text = Get-Content -LiteralPath 'C:\Daten\bericht.txt' -Raw -Encoding 'UTF8'
$Treffer = [regex]::Matches($Text, '(?m)^Kundennummer:\s*(?<wert>\S+)') |
    ForEach-Object { [pscustomobject]@{ Wert = $_.Groups['wert'].Value } }
$Treffer | Export-Csv -LiteralPath 'C:\Daten\ergebnis.csv' -Delimiter ';' -Encoding 'UTF8' -NoTypeInformation
```

Die Quelle wird pro Eingabefeld ausgewählt. Diese Verbindungen werden im Projekt gespeichert und mit den Ausgabenamen aktualisiert. Manuelle Variablennamen bleiben möglich. Verbindungen dürfen nur auf vorherige Ausgaben im gleichen oder einem umgebenden Block zeigen. Bei der Extraktion aus mehreren Dateien können Quelldatei und Trefferposition im kurzen Modus abgewählt werden.

Der Vorschau-Modus bleibt standardmäßig aktiv: In kurzen Skripten werden Änderungsschritte sichtbar auskommentiert. Für ausführbare Änderungen unter **Optionen** deaktivieren. Die ausführliche Ausgabe schützt Änderungen weiterhin mit ShouldProcess und unterstützt `-WhatIf`. Die Seite selbst führt keine Administratorbefehle aus.

## Offline verwenden

`index.html` herunterladen und in Edge öffnen. Alternativ in der App **HTML herunterladen** wählen. Der Browser braucht danach keine Internetverbindung. Die Content Security Policy verhindert Netzwerkaufrufe der App; es werden keine Dateien an einen Dienst übertragen.

## Arbeitsablauf

1. Aufgabe, Stichwort oder Cmdlet suchen, zum Beispiel „alte Dateien löschen“, „Benutzer CSV“, „NTFS Rechte“ oder `Get-ChildItem`.
2. Einzelne Bausteine hinzufügen oder einen fertigen Ablauf laden. Die Suche nutzt Synonyme und toleriert Tippfehler.
3. Felder anpassen. Texte werden als PowerShell-Literale zitiert; **fx** wechselt zu einem sichtbaren PowerShell-Ausdruck, etwa `$Datei.FullName`.
4. Eingaben über die Quellauswahl mit vorherigen Bausteinen verbinden. Die Verbindung bleibt beim Umbenennen erhalten; gelöschte oder nach hinten verschobene Quellen werden gemeldet.
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

## PowerHelp 3.0: ISE-Katalog und Verknüpfungshilfe

Zusätzlich zu den 107 geführten Bausteinen stehen unter **Alle Befehle** 1.306 echte
Befehlsdefinitionen aus 32 Windows-Modulen zur Verfügung. Erfasst mit `Get-Command`
in Windows PowerShell 5.1 auf Windows Server 2025. Der Katalog enthält keine
Microsoft-365-Module und ist vollständig in der Offline-HTML eingebaut. Er ist
kein Versprechen, dass alle Module auf jedem Windows-Rechner verfügbar sind.

- Modulfilter, Befehls-/Parametersuche, deutsche Aufgabenbegriffe.
- ISE-artige Parameterformulare mit auswählbarem Parametersatz.
- Pflichtfelder sichtbar; weitere Parameter gezielt aktivieren.
- Typinformationen, Auswahlwerte, Aliase und Pipelineangaben aus echten Metadaten.
- Unvereinbare Parameterkombinationen blockieren den Export.
- `fx` für ScriptBlocks, Hashtables, Credentials und andere komplexe Werte.
- Eingabevariablen erzeugen eine Pipeline; Ausgabevariablen können leer bleiben.
- Wirkung zunächst **Änderung / unbekannt**: der Schritt wird im Vorschau-Modus
  übersprungen. Bei geprüften Lesebefehlen auf **Nur lesen** umstellen.
- Kontextbezogene nächste Schritte für typische Abläufe; für Katalogbefehle
  zusätzlich Vorschläge anhand deklarierter Pipeline- und Ausgabetypen.

### Katalog eines konkreten Servers importieren

Unter **Server-Katalog** das Exportskript herunterladen. Auf dem gewünschten
Rechner in **Windows PowerShell 5.1** ausführen:

```powershell
.\Export-PowerHelpCatalog.ps1 -Path .\PowerHelp-Catalog.json
# Optional: alle bereits installierten Module berücksichtigen
.\Export-PowerHelpCatalog.ps1 -Path .\PowerHelp-Catalog.json -AllAvailable
```

Die JSON-Datei in PowerHelp importieren. Sie ergänzt/aktualisiert den eingebauten
Katalog und wird in der Projektdatei mitgespeichert. Das Skript installiert nichts,
aktualisiert keine Hilfe, kontaktiert keinen Server und führt die gefundenen
Administratorbefehle nicht aus. `Get-Command` kann vorhandene Module laden; deren
Initialisierungscode liegt außerhalb von PowerHelp. Mit `-AllAvailable` erscheinen
auch bereits vorhandene Drittanbietermodule. Der Standardexport ist auf die im
Skript aufgezählten Windows- und Rollenmodule begrenzt.

### Grenzen der Verknüpfungshilfe

Die Verknüpfungshilfe arbeitet mit Regeln, nicht mit einer Online-KI. Deklarierte
Ausgabetypen sind nicht immer vollständig. Tatsächliche Pipelinebindung,
Objekteigenschaften, dynamische Providerparameter, Ressourcen, Berechtigungen
und Seiteneffekte können im Browser nicht vollständig geprüft werden. Vorhandene
Skriptparameter und eigene Ausdrücke bleiben PowerShell-Code. Unbekannte
Parametersätze und ungültige Imports werden zurückgewiesen.

### Katalog regenerieren

```powershell
.\tools\Export-PowerHelpCatalog.ps1 -Path catalog.json
```

```sh
python tools/pack_catalog.py catalog.json src/builtin.js
python build.py
node tests/test-core.js
node tests/generate-cases.js cases.json
```

Die CI parst nun 3.572 erzeugte Skripte: geführte Bausteine/Vorlagen sowie jeden
Parametersatz aller eingebauten Befehle. Sie führt diese Skripte nicht aus.
