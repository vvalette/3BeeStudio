# Codes d'offres de transport Boxtal (API v3)

> Source : documentation Boxtal — « Récupérer la liste des codes d'offres de transport pour l'API v3 ». Relevé le 10 août 2026.

Code à passer dans `shippingOfferCode` lors d'un `POST /shipping/v3.1/shipping-order`.

⚠️ **Ce catalogue liste toutes les offres Boxtal, pas celles activées sur le compte.**
L'API ne permet pas de connaître le contrat : un code non souscrit renvoie
`NoShippingOfferException` sans détail. Le seul moyen de savoir ce qui est actif
reste le tableau de bord Boxtal — ou l'essai, ce que fait `offerCodesFor()` dans
[`src/lib/boxtal.ts`](../src/lib/boxtal.ts) via une liste ordonnée avec repli.

⚠️ **Le repli ne s'applique qu'aux offres domicile.** En point relais, le
`pickupPointCode` enregistré sur la commande appartient au réseau interrogé par
le sélecteur : basculer vers l'offre relais d'un autre transporteur enverrait un
code de point qu'il ne connaît pas. Pour changer de réseau relais, changer
`BOXTAL_RELAY_OFFER_CODE` — le sélecteur et l'expédition suivent ensemble.

Version machine : [`shipping-offer-codes.json`](shipping-offer-codes.json) (champs `kind` = `home`/`relay`/`return`, `scope` = `france`/`international`/`domtom`).

## Offres utilisées par 3BeeStudio

| Usage | Code | Service |
|---|---|---|
| Point relais (défaut) | `MONR-CpourToi` | Mondial Points Relais |
| Point relais (alternative) | `CHRP-ChronoShoptoShop` | Chrono Shop2Shop |
| Point relais (alternative) | `SOGP-RelaisColis` | Relais Colis |
| Domicile France (défaut) | `MONR-DomicileFrance` | Mondial Domicile France |
| Domicile France (repli) | `POFR-ColissimoAccess` | Colissimo Domicile sans signature |
| Outre-Mer | `POFR-ColissimoAccessOutreMer` | Colissimo Domicile Outre-Mer |
| International | `POFR-ColissimoExpertInternational` | Colissimo International avec signature |

## Catalogue complet

`kind` : **home** = livraison à domicile · **relay** = point relais/retrait · **return** = retour

| Transporteur | Service | Code | kind | scope |
|---|---|---|---|---|
| Chronopost | Chrono 13 | `CHRP-Chrono13` | home | france |
| Chronopost | Chrono 13 collecte | `CHRP-Chrono13Pickup` | home | france |
| Chronopost | Chrono 18 | `CHRP-Chrono18` | home | france |
| Chronopost | Chrono 18 collecte | `CHRP-Chrono18Pickup` | home | france |
| Chronopost | Chrono 2Shop Direct | `CHRP-Chrono2ShopDirect` | relay | france |
| Chronopost | Chrono 2Shop Direct collecte | `CHRP-Chrono2ShopDirectPickup` | relay | france |
| Chronopost | Chrono 2Shop Europe | `CHRP-Chrono2ShopEurope` | relay | international |
| Chronopost | Chrono 2Shop Europe collecte | `CHRP-Chrono2ShopEuropePickup` | relay | international |
| Chronopost | Chrono 2Shop Europe Retour | `CHRP-Chrono2ShopEuropeRetour` | return | international |
| Chronopost | Chrono 2ShopDirect Retour | `CHRP-Chrono2ShopDirectRetour` | return | france |
| Chronopost | Chrono Classic | `CHRP-ChronoInternationalClassic` | home | international |
| Chronopost | Chrono Classic collecte | `CHRP-ChronoInternationalClassicPickup` | home | international |
| Chronopost | Chrono Express | `CHRP-ChronoInternationalColis` | home | international |
| Chronopost | Chrono Express collecte | `CHRP-ChronoInternationalColisPickup` | home | international |
| Chronopost | Chrono Relais 13 | `CHRP-ChronoRelais` | relay | france |
| Chronopost | Chrono Relais 13 collecte | `CHRP-ChronoRelaisPickup` | relay | france |
| Chronopost | Chrono Relais Europe | `CHRP-ChronoRelaisEurope` | relay | international |
| Chronopost | Chrono Relais Europe collecte | `CHRP-ChronoRelaisEuropePickup` | relay | international |
| Chronopost | Chrono Shop2Shop | `CHRP-ChronoShoptoShop` | relay | france |
| Chronopost | Chrono18 boîte aux lettres | `CHRP-Chrono18BAL` | home | france |
| Colis Privé | Colis Privé Domicile | `COPR-CoprRelaisDomicileNat` | home | france |
| Colis Privé | Colis Privé Domicile avec signature | `COPR-CoprRelaisSignatureNat` | home | france |
| Colis Privé | Colis Privé Relais | `COPR-CoprRelaisRelaisNat` | relay | france |
| Colissimo | Colissimo Domicile - avec signature | `POFR-ColissimoExpert` | home | france |
| Colissimo | Colissimo Domicile - sans signature | `POFR-ColissimoAccess` | home | france |
| Colissimo | Colissimo Domicile Outre-Mer - avec signature | `POFR-ColissimoExpertOutreMer` | home | domtom |
| Colissimo | Colissimo Domicile Outre-Mer - sans signature | `POFR-ColissimoAccessOutreMer` | home | domtom |
| Colissimo | Colissimo International Domicile - avec signature | `POFR-ColissimoExpertInternational` | home | international |
| Colissimo | Colissimo International Domicile - sans signature | `POFR-ColissimoAccessInternational` | home | international |
| Colissimo | Colissimo International Point Retrait | `POFR-ColissimoPickupStationInternational` | relay | international |
| Colissimo | Colissimo Point Retrait | `POFR-ColissimoPickupStation` | relay | france |
| Delivengo | Delivengo easy | `DLVG-DelivengoEasy` | home | france |
| DHL Express | DHL Domestic Express | `DHLE-DomesticExpress` | home | france |
| DHL Express | DHL Express Economy Select | `DHLE-EconomySelect` | home | france |
| DHL Express | DHL Express Import | `DHLE-ExpressImport` | home | international |
| DHL Express | DHL Express Worldwide | `DHLE-ExpressWorldwide` | home | international |
| DHL Freight | DHL Freight EuroConnect Domestic | `DHLF-EuroConnectDomestic` | home | france |
| FedEx | FedEx First | `FEDX-FedexFirst` | home | france |
| FedEx | FedEx International Connect Plus | `FEDX-FedexInternationalConnectPlus` | home | international |
| FedEx | FedEx International Economy | `FEDX-InternationalEconomy` | home | international |
| FedEx | FedEx International Priority | `FEDX-InternationalPriority` | home | international |
| FedEx | FedEx International Priority Express | `FEDX-FedexInternationalPriorityExpress` | home | international |
| FedEx | FedEx Priority | `FEDX-DomesticExpress` | home | france |
| FedEx | FedEx Priority Express | `FEDX-FedexPriorityExpress` | home | france |
| FedEx | FedEx Regional Economy | `FEDX-FedexRegionalEconomy` | home | france |
| FedEx | FedEx Regional Economy Freight | `FEDX-FedexRegionalEconomyFreight` | home | france |
| Happy Post | Happy Post avec Suivi sans Signature | `IMXE-PackSuiviEurope` | home | international |
| La Poste | Lettre Verte Suivie | `LPFR-LettreSuivieSU` | home | france |
| La Poste | Lettre Verte Suivie | `LPFR-LettreSuivieNational` | home | france |
| Mondial Relay | Mondial Domicile Europe | `MONR-DomicileEurope` | home | international |
| Mondial Relay | Mondial Domicile France | `MONR-DomicileFrance` | home | france |
| Mondial Relay | Mondial Points Relais | `MONR-CpourToi` | relay | france |
| Mondial Relay | Mondial Points Relais - Europe | `MONR-CpourToiEurope` | relay | international |
| Relais Colis | Relais Colis | `SOGP-RelaisColis` | relay | france |
| Sodexi | Sodexi Express | `SODX-ExpressStandard` | home | france |
| Sodexi | Sodexi Express International | `SODX-ExpressStandardInterColisMarch` | home | international |
| TNT | TNT 10:00 Express | `TNTE-ExpressNationalPremium10H` | home | france |
| TNT | TNT 12:00 Express | `TNTE-ExpressNationalPremium12H` | home | france |
| TNT | TNT 13:00 Express | `TNTE-ExpressNational` | home | france |
| TNT | TNT 13:00 Express Bulk | `TNTE-ExpressNationalBulk` | home | france |
| TNT | TNT 18:00 Express | `TNTE-ExpressNational18H` | home | france |
| TNT | TNT 18:00 Express Bulk | `TNTE-ExpressNational18HBulk` | home | france |
| TNT | TNT Economy Express | `TNTE-EconomyExpressInternational` | home | international |
| TNT | TNT Economy Express Import | `TNTE-EconomyExpressInternationalImport` | home | international |
| TNT | TNT Express International | `TNTE-ExpressInternationalColis` | home | international |
| TNT | TNT Express International Doc | `TNTE-ExpressInternationalPlis` | home | international |
| TNT | TNT Express National Palette | `TNTE-ExpressNationalPalette` | home | france |
| UPS | UPS Economy Access Point | `UPSE-EconomyAccessPoint` | relay | france |
| UPS | UPS Expedited | `UPSE-Expedited` | home | france |
| UPS | UPS Express | `UPSE-Express` | home | france |
| UPS | UPS Express Plus | `UPSE-ExpressPlus` | home | france |
| UPS | UPS Express Saver | `UPSE-ExpressSaver` | home | france |
| UPS | UPS Standard | `UPSE-Standard` | home | france |
| UPS | UPS Standard Access Point | `UPSE-StandardAP` | relay | france |

_74 offres._
