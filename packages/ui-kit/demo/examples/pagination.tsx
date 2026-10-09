import { useState } from 'react';

import {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationNextButton,
  PaginationPrevious,
  PaginationPreviousButton,
} from '@gears-frontx/ui-kit';

import { Measure, Section } from '../shared';

const PAGES = [1, 2, 3, 4, 5];

// State-driven paging: the page lives in component state, so each item is a
// button rather than a link, and the ends of the range disable Previous/Next.
// focusableWhenDisabled keeps keyboard focus on the one that was just pressed
// down to the end of the range, instead of dropping it to the page.
function ButtonPager() {
  const [page, setPage] = useState(2);
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPreviousButton
            disabled={page === 1}
            focusableWhenDisabled
            onClick={() => setPage(page - 1)}
          />
        </PaginationItem>
        {PAGES.map((n) => (
          <PaginationItem key={n}>
            <PaginationButton isActive={n === page} onClick={() => setPage(n)}>
              {n}
            </PaginationButton>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNextButton
            disabled={page === PAGES.length}
            focusableWhenDisabled
            onClick={() => setPage(page + 1)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export default function PaginationExample() {
  return (
    <>
      {/* A full row with the active page in the middle, plus the compact and
          the minimal arrangements below. Everything in the row sits on the
          same 28px box; only the prev/next pair trades the square for
          horizontal padding. */}
      <Section title="Default">
        <Measure
          of={{
            'inactive item': '#pg-full [href="#3"]',
            'active item': '#pg-full [aria-current=page]',
            previous: '#pg-full [aria-label="Go to previous page"]',
            ellipsis: '#pg-full li > span[aria-hidden]',
            row: '#pg-full ul',
            'prev icon': '#pg-full [aria-label="Go to previous page"] svg',
          }}
        >
          <Pagination id="pg-full">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#1">1</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#2" isActive>
                  2
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#3">3</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </Measure>
      </Section>

      <Section title="Button mode">
        <ButtonPager />
      </Section>

      <Section title="Right-to-left chevrons">
        <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPreviousButton />
              </PaginationItem>
              <PaginationItem>
                <PaginationNextButton />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </Section>

      <Section title="Simple">
        <Pagination>
          <PaginationContent>
            {[1, 2, 3, 4, 5].map((page) => (
              <PaginationItem key={page}>
                <PaginationLink href="#" isActive={page === 1}>
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
          </PaginationContent>
        </Pagination>
      </Section>

      <Section title="Icons only">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" text="" />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" text="" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </Section>
    </>
  );
}
