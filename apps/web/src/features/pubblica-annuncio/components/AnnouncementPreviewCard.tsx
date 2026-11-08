import {createAnnouncementPreviewCard} from "@bacheca/announcements/ui/preview-card";
import {ExternalLink} from "@/components/navigation/ExternalNavigation";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Separator} from "@/components/ui/separator";
import TeamProfileLinks from "@/features/profilo/TeamProfileLinks";
import {cn} from "@/lib/utils";

export default createAnnouncementPreviewCard({ExternalLink, Alert, AlertDescription, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Separator, TeamProfileLinks, cn});
