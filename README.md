# PowerHelp – Offline-Prototyp

Eine kleine, vollständig lokale Webseite zum Zusammenstellen von Skripten für **Windows PowerShell 5.1**. Sie braucht keine Installation, keinen Webserver und keine Netzwerkverbindung.

## Start

`index.html` herunterladen und in Edge öffnen. Alternativ das Repository als ZIP herunterladen und `index.html` öffnen. Einen Baustein links auswählen, Felder in der Mitte ausfüllen und den erzeugten Code rechts prüfen. Über **Skript als .ps1 speichern** wird die Datei mit UTF-8-BOM heruntergeladen, damit Windows PowerShell 5.1 Umlaute im Skript erkennt.

## Was der erste Stand kann

- Ordner anlegen, Dateien suchen, kopieren und verschieben; Dateiliste als CSV exportieren.
- Lokale Benutzer und Gruppen anzeigen, lokale Gruppe anlegen, Mitglied hinzufügen.
- Textdateien mit einem **.NET-kompatiblen regulären Ausdruck** durchsuchen, benannte oder nummerierte Treffergruppe auslesen und die Treffer als CSV speichern.
- Erforderliche Eingaben, identische Quelle/Ziel und einige Abhängigkeiten in der Schrittreihenfolge prüfen.

Das Beispiel zeigt eine Suche nach `Kundennummer:` in mehreren UTF-8-Textdateien. Eine Zeile wie `Kundennummer: 12345` führt zum Wert `12345` in der CSV. Das Regex-Feld akzeptiert auch andere .NET-Muster; die Gruppe kann `wert`, `1` oder `0` (gesamter Treffer) heißen.

## Grenzen

Die Webseite **führt kein Skript aus** und kann ohne lokale Komponente weder die tatsächliche PowerShell-Syntax noch vorhandene Module oder Zugriffsrechte prüfen. Die Regex-Syntax wird erst durch PowerShell bei der Ausführung validiert. Die Regex-Funktion liest Eingabedateien derzeit als UTF-8. Lokale Benutzer-/Gruppenbefehle benötigen das Windows-Modul `Microsoft.PowerShell.LocalAccounts` in einer passenden Windows PowerShell 5.1-Umgebung; das Modul fehlt in der 32-Bit-PowerShell auf einem 64-Bit-System. „Lokal“ bezieht sich auf den Rechner, auf dem das erzeugte Skript später läuft.

Der Code wird als Text ausgegeben. Vor der Ausführung auf einem Server sollten Pfade, Dateimuster und Auswirkungen des Skripts geprüft werden. Dieser Prototyp enthält bewusst noch keine Ausführungsfunktion.
