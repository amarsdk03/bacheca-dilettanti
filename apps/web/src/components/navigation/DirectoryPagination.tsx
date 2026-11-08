import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious
} from "@/components/ui/pagination";

export default function DirectoryPagination({currentPage, totalPages, href, label}: {
	currentPage: number; totalPages: number; href: (page: number) => string; label: string;
}) {
	if (totalPages <= 1) return null;
	const pages = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages])].filter(page => page > 0 && page <= totalPages).sort((a, b) => a - b);
	return <Pagination aria-label={label}>
		<PaginationContent className="flex-wrap justify-center gap-y-2">
			{currentPage > 1 && <PaginationItem><PaginationPrevious href={href(currentPage - 1)} text="Precedente" aria-label="Vai alla pagina precedente" /></PaginationItem>}
			{pages.map((page, index) => {
				const mobileVisible = page === 1 || page === totalPages || page === currentPage;
				const previousMobile = page === currentPage ? 1 : currentPage;
				const desktopGap = index > 0 && page - pages[index - 1] > 1;
				const mobileGap = mobileVisible && page > 1 && page - previousMobile > 1;
				return <PaginationItem key={page} className={mobileVisible ? undefined : "hidden sm:list-item"}>
					<div className="flex items-center">
						{desktopGap && <PaginationEllipsis className="hidden sm:flex" />}
						{mobileGap && <PaginationEllipsis className="sm:hidden" />}
						<PaginationLink href={href(page)} isActive={page === currentPage} aria-label={`Pagina ${page}`}>{page}</PaginationLink>
					</div>
				</PaginationItem>;
			})}
			{currentPage < totalPages && <PaginationItem><PaginationNext href={href(currentPage + 1)} text="Successiva" aria-label="Vai alla pagina successiva" /></PaginationItem>}
		</PaginationContent>
	</Pagination>;
}
