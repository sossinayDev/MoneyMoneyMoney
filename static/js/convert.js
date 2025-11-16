const iban_location = "Document/BkToCstmrStmt/Stmt/Acct/Id/IBAN";
const account_owner_location = "Document/BkToCstmrStmt/Stmt/Acct/Ownr/Nm";


function add_entry_to_ms_money(bookingDate, remittanceInfo, amount, reciever, category) {
    let entry = "";
    let d = new Date();

    let msec = d.getTime();
    let rec = reciever;
    if (rec.length > 32) {
        rec = rec.substring(0, 32);
    }
    const [year, month, day] = bookingDate.split('-');
    entry += `D${day}.${month}'${year}\n`;
    entry += `M${remittanceInfo}\n`;
    entry += `T${amount}\n`;
    entry += `P${rec}\n`;
    entry += `N$${msec}\n`;
    /* entry += `L${category}\n`; */
    entry += "^\n";
    entry.replaceAll("ö", "oe");
    entry.replaceAll("ä", "ae");
    entry.replaceAll("ü", "ue");
    entry.replaceAll("Ö", "Oe");
    entry.replaceAll("Ä", "Ae");
    entry.replaceAll("Ü", "Ue");
    return entry;
}

async function convert(text) {
    let ms_money_result = "!Type:Bank\n";
    switch_to_parsing();
    await delay(1);
    // Parse the XML text
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "application/xml");

    const ibanElements = xmlDoc.getElementsByTagName("IBAN");
    let iban = ibanElements.length > 0 ? ibanElements[0].textContent.trim() : "IBAN nicht gefunden";
    const ownerElements = xmlDoc.getElementsByTagName("Nm");
    let ownerName = ownerElements.length > 0 ? ownerElements[0].textContent.trim() : "Name nicht gefunden";

    // Display the results
    add_info(`IBAN: ${iban}`);
    add_info(`Kontoinhaber: ${ownerName}`);

    let entries = xmlDoc.getElementsByTagName("Ntry");
    add_info(`Anzahl Einträge: ${entries.length}`);

    let failed_count = 0;
    for (let i = 0; i < entries.length; i++) {
        let reciever = null;
        let entry = entries[i];
        let amount = entry.getElementsByTagName("Amt")[0].textContent;
        let cdtDbtInd = entry.getElementsByTagName("CdtDbtInd")[0].textContent;
        if (cdtDbtInd === "DBIT") {
            amount = -amount;
        }
        
        let bookingDate = entry.getElementsByTagName("BookgDt")[0].getElementsByTagName("Dt")[0].textContent;
        let valutionDate = entry.getElementsByTagName("ValDt")[0].getElementsByTagName("Dt")[0].textContent;
        let remittanceInfoElem = entry.getElementsByTagName("RmtInf");
        let remittanceInfo = remittanceInfoElem.length > 0 ? remittanceInfoElem[0].textContent.trim() : "Keine Angaben";
        
        if (remittanceInfo.includes("AHV Altersrente")){
            reciever = ownerName;
            remittanceInfo = "AHV Altersrente";
        }

        if (reciever == null) {
            const addtlElem = entry.getElementsByTagName("AddtlNtryInf");
            if (addtlElem.length > 0) {
                reciever = addtlElem[0].textContent.trim();
                if (reciever.startsWith("TWINT")) {
                    if (reciever.includes("TWINT GELD EMPFANGEN")) {
                        reciever = ownerName;
                    }
                    else if (reciever.includes("PARKINGPAY-TWINT")) {
                        reciever = "PARKINGPAY-TWINT";
                        remittanceInfo = "Parkingpay Twint Zahlung";
                    }
                    else {
                        const [year, month, day] = valutionDate.split('-');
                        valutionDate = `${day}.${month}.${year}`;
                        let parts = reciever.split(valutionDate);
                        if (parts.length > 1) {
                            remittanceInfo = parts[1].trim().split("MITTEILUNGEN:")
                            if (remittanceInfo.length > 1) {
                                remittanceInfo = remittanceInfo[1].trim();
                            } else {
                                remittanceInfo = "TWINT-Zahlung";
                            }
                            reciever = parts[1].trim().split("MITTEILUNGEN:")[0].replace("MITTEILUNGEN:","").trim() + " (Twint)";
                        }
                    }
                }
                else if (reciever.includes("KARTEN NR. XXXX")){
                    let backpart = reciever.split("KARTEN NR. XXXX")[1].trim().substring(4).trim();
                    reciever = backpart;
                }
                else if (reciever.startsWith("LASTSCHRIFT")){
                    remittanceInfo = "Lastschrift";
                    reciever = reciever.substring(34).trim();
                }
                else if (reciever.startsWith("AUFTRAG")){
                    remittanceInfo = "Auftrag";
                    reciever = reciever.split("ZAHLUNGSEMPFÄNGER:")[1].trim().split("MITTEILUNGEN:")[0].trim();
                }
            } else {
                console.warn(reciever);
                failed_count += 1;
                reciever = "Unbekannt";
            }
        }

        console.log(reciever);

        ms_money_result += add_entry_to_ms_money(bookingDate, remittanceInfo, amount, reciever, "Sonstiges");

        edit_info(`Verarbeite Einträge... (${i + 1}/${entries.length}) - Fehlgeschlagen: ${failed_count}`);
        await delay(Math.random() * 0.02)
    }


    add_info("Verarbeitung abgeschlossen.");
    download_result(ms_money_result)
}