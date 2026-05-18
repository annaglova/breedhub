import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routerMock = vi.hoisted(() => ({
  navigate: vi.fn(),
  location: {
    pathname: "/my/pets/current-pet",
    search: "?scope=bred",
    hash: "",
  },
}));

const storeMock = vi.hoisted(() => ({
  selectedId: "current-pet",
  selectedSignal: { value: "current-pet" as string | undefined },
  isFullscreen: { value: false },
  saveRoute: vi.fn(),
  getSelectedIdSignal: vi.fn(),
  getSelectedId: vi.fn(),
  selectEntity: vi.fn(),
  clearSelection: vi.fn(),
  clearFullscreen: vi.fn(),
  fetchAndSelectEntity: vi.fn(),
  getSpaceConfig: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => routerMock.navigate,
  useLocation: () => routerMock.location,
}));

vi.mock("@breedhub/rxdb-store", () => ({
  routeStore: {
    saveRoute: storeMock.saveRoute,
  },
  spaceStore: {
    isFullscreen: storeMock.isFullscreen,
    getSelectedIdSignal: storeMock.getSelectedIdSignal,
    getSelectedId: storeMock.getSelectedId,
    selectEntity: storeMock.selectEntity,
    clearSelection: storeMock.clearSelection,
    clearFullscreen: storeMock.clearFullscreen,
    fetchAndSelectEntity: storeMock.fetchAndSelectEntity,
    getSpaceConfig: storeMock.getSpaceConfig,
  },
}));

import { useEntitySelection } from "../useEntitySelection";

type Entity = {
  id: string;
  name: string;
  slug: string;
};

type HookOptions = Parameters<typeof useEntitySelection>[0];

const currentEntity: Entity = {
  id: "current-pet",
  name: "Current Pet",
  slug: "current-pet",
};

const firstEntity: Entity = {
  id: "first-pet",
  name: "First Pet",
  slug: "first-pet",
};

const otherEntity: Entity = {
  id: "other-pet",
  name: "Other Pet",
  slug: "other-pet",
};

function setLocation(pathname: string, search = "", hash = "") {
  routerMock.location.pathname = pathname;
  routerMock.location.search = search;
  routerMock.location.hash = hash;
  window.history.pushState({}, "", `${pathname}${search}${hash}`);
}

function makeOptions(overrides: Partial<HookOptions> = {}): HookOptions {
  return {
    config: {
      entitySchemaName: "pet",
      slug: "pets",
    },
    allEntities: [currentEntity, otherEntity],
    isLoading: false,
    isGridView: false,
    isMoreThan2XL: false,
    ...overrides,
  };
}

function resetMocks() {
  routerMock.navigate.mockReset();
  storeMock.saveRoute.mockReset();
  storeMock.getSelectedIdSignal.mockReset();
  storeMock.getSelectedId.mockReset();
  storeMock.selectEntity.mockReset();
  storeMock.clearSelection.mockReset();
  storeMock.clearFullscreen.mockReset();
  storeMock.fetchAndSelectEntity.mockReset();
  storeMock.getSpaceConfig.mockReset();

  storeMock.selectedId = "current-pet";
  storeMock.selectedSignal.value = "current-pet";
  storeMock.isFullscreen.value = false;
  storeMock.getSelectedIdSignal.mockReturnValue(storeMock.selectedSignal);
  storeMock.getSelectedId.mockImplementation(() => storeMock.selectedId);
}

function mountAtBred(overrides: Partial<HookOptions> = {}) {
  setLocation("/my/pets/current-pet", "?scope=bred");

  return renderHook((props: HookOptions) => useEntitySelection(props), {
    initialProps: makeOptions(overrides),
  });
}

function mountForBackdrop(
  pathname: string,
  search = "",
  hash = "",
  overrides: Partial<HookOptions> = {},
) {
  setLocation(pathname, search, hash);

  const segments = pathname.split("/").filter(Boolean);
  const entitySlug = segments[segments.length - 1] || currentEntity.slug;
  const selectedEntity = {
    id: entitySlug,
    name: entitySlug,
    slug: entitySlug,
  };
  storeMock.selectedId = selectedEntity.id;
  storeMock.selectedSignal.value = selectedEntity.id;

  return renderHook((props: HookOptions) => useEntitySelection(props), {
    initialProps: makeOptions({
      allEntities: [selectedEntity],
      ...overrides,
    }),
  });
}

describe("useEntitySelection scope redirect", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("navigates to the first entity after scope changes and entities refilter", () => {
    const bredEntities = [currentEntity, otherEntity];
    const allEntities = [firstEntity, currentEntity];
    const { rerender } = mountAtBred({ allEntities: bredEntities });

    routerMock.navigate.mockClear();

    setLocation(
      "/my/pets/current-pet",
      "?view=list&scope=all&sort=name",
      "#general",
    );
    rerender(makeOptions({ allEntities: bredEntities }));

    expect(routerMock.navigate).not.toHaveBeenCalled();

    rerender(makeOptions({ allEntities }));

    expect(routerMock.navigate).toHaveBeenCalledTimes(1);
    expect(routerMock.navigate).toHaveBeenCalledWith(
      "/my/pets/first-pet?view=list&scope=all&sort=name#general",
      { replace: true },
    );
  });

  it("waits when the scope changed but entities have not refiltered yet", () => {
    const bredEntities = [currentEntity, otherEntity];
    const { rerender } = mountAtBred({ allEntities: bredEntities });

    routerMock.navigate.mockClear();

    setLocation("/my/pets/current-pet", "?scope=all");
    rerender(makeOptions({ allEntities: bredEntities }));

    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it("does not navigate when the new first entity is already in the URL", () => {
    const bredEntities = [currentEntity, otherEntity];
    const allEntities = [currentEntity, firstEntity];
    const { rerender } = mountAtBred({ allEntities: bredEntities });

    routerMock.navigate.mockClear();

    setLocation("/my/pets/current-pet", "?scope=all");
    rerender(makeOptions({ allEntities: bredEntities }));
    rerender(makeOptions({ allEntities }));

    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it("does not navigate on initial mount with an existing scope", () => {
    mountAtBred();

    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it("holds the redirect while loading", () => {
    const bredEntities = [currentEntity, otherEntity];
    const allEntities = [firstEntity, currentEntity];
    const { rerender } = mountAtBred({ allEntities: bredEntities });

    routerMock.navigate.mockClear();

    setLocation("/my/pets/current-pet", "?scope=all");
    rerender(makeOptions({ allEntities: bredEntities }));
    rerender(makeOptions({ allEntities, isLoading: true }));

    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it("skips the redirect when initialSelectedEntityId is set", () => {
    const bredEntities = [currentEntity, otherEntity];
    const allEntities = [firstEntity, currentEntity];
    const { rerender } = mountAtBred({
      allEntities: bredEntities,
      initialSelectedEntityId: currentEntity.id,
    });

    routerMock.navigate.mockClear();

    setLocation("/my/pets/current-pet", "?scope=all");
    rerender(
      makeOptions({
        allEntities: bredEntities,
        initialSelectedEntityId: currentEntity.id,
      }),
    );
    rerender(
      makeOptions({
        allEntities,
        initialSelectedEntityId: currentEntity.id,
      }),
    );

    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it("skips the redirect in create mode", () => {
    const bredEntities = [currentEntity, otherEntity];
    const allEntities = [firstEntity, currentEntity];
    const { rerender } = mountAtBred({
      allEntities: bredEntities,
      createMode: true,
    });

    routerMock.navigate.mockClear();

    setLocation("/my/pets/current-pet", "?scope=all");
    rerender(makeOptions({ allEntities: bredEntities, createMode: true }));
    rerender(makeOptions({ allEntities, createMode: true }));

    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it("skips the redirect in grid view", () => {
    const bredEntities = [currentEntity, otherEntity];
    const allEntities = [firstEntity, currentEntity];
    const { rerender } = mountAtBred({
      allEntities: bredEntities,
      isGridView: true,
    });

    routerMock.navigate.mockClear();

    setLocation("/my/pets/current-pet", "?scope=all");
    rerender(makeOptions({ allEntities: bredEntities, isGridView: true }));
    rerender(makeOptions({ allEntities, isGridView: true }));

    expect(routerMock.navigate).not.toHaveBeenCalled();
  });
});

describe("handleBackdropClick", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("navigates nested workspace paths back to the space list", () => {
    const { result } = mountForBackdrop("/my/pets/test-pet");
    routerMock.navigate.mockClear();

    act(() => {
      result.current.handleBackdropClick();
    });

    expect(routerMock.navigate).toHaveBeenCalledWith("/my/pets");
  });

  it("navigates root-mounted space paths back to the space list", () => {
    const { result } = mountForBackdrop("/pets/foo");
    routerMock.navigate.mockClear();

    act(() => {
      result.current.handleBackdropClick();
    });

    expect(routerMock.navigate).toHaveBeenCalledWith("/pets");
  });

  it("preserves search and hash when navigating back to the space list", () => {
    const search =
      "?view=list&sort=rating&pet_type_id=dog&breed_id=chihuahua";
    const hash = "#general";
    const { result } = mountForBackdrop("/pets/foo", search, hash);
    routerMock.navigate.mockClear();

    act(() => {
      result.current.handleBackdropClick();
    });

    expect(routerMock.navigate).toHaveBeenCalledWith(
      `/pets${search}${hash}`,
    );
  });

  it("uses the configured space list path for an initial selected entity", () => {
    storeMock.getSpaceConfig.mockReturnValue({ slug: "configured-pets" });
    const search = "?view=list&sort=rating";
    const hash = "#general";
    const { result } = mountForBackdrop("/my/pets/current-pet", search, hash, {
      initialSelectedEntityId: currentEntity.id,
    });
    routerMock.navigate.mockClear();

    act(() => {
      result.current.handleBackdropClick();
    });

    expect(storeMock.getSpaceConfig).toHaveBeenCalledWith("pet");
    expect(routerMock.navigate).toHaveBeenCalledWith(
      `/configured-pets${search}${hash}`,
    );
  });

  it("closes the drawer after the backdrop click", () => {
    const { result } = mountForBackdrop("/pets/current-pet", "", "", {
      initialSelectedEntityId: currentEntity.id,
    });

    expect(result.current.isDrawerOpen).toBe(true);

    act(() => {
      result.current.handleBackdropClick();
    });

    expect(result.current.isDrawerOpen).toBe(false);
  });

  it("clears fullscreen state after the backdrop click", () => {
    const { result } = mountForBackdrop("/pets/foo");
    storeMock.clearFullscreen.mockClear();

    act(() => {
      result.current.handleBackdropClick();
    });

    expect(storeMock.clearFullscreen).toHaveBeenCalledTimes(1);
  });
});
